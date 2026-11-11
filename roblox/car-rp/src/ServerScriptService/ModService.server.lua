-- Script: ServerScriptService > ModService
-- ورشة التعديل: لازم تكون سايق سيارتك وقريب من ورشة.
-- حط Parts داخل Folder اسمه ModShops في Workspace (مكان كل ورشة).

local DataStoreService = game:GetService("DataStoreService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local CarConfig = require(ReplicatedStorage:WaitForChild("CarConfig"))
local PlateFormat = require(ReplicatedStorage:WaitForChild("PlateFormat"))
local PlayerData = require(script.Parent:WaitForChild("PlayerData"))
local Remotes = require(script.Parent:WaitForChild("Remotes"))
local CarMods = require(script.Parent:WaitForChild("CarMods"))
local CarUtil = require(script.Parent:WaitForChild("CarUtil"))

-- كل لوحة لها صاحب واحد في كل السيرفرات
local plateStore = DataStoreService:GetDataStore("CarRP_Plates_v1")

local Mods = CarConfig.Mods
local KIND_TO_LIST = { Paint = "Paints", Tint = "Tints", Rim = "Rims" }
local busy = {}

local function nearShop(car)
	local folder = workspace:FindFirstChild("ModShops")
	if not folder then
		return false
	end
	local pos = car:GetPivot().Position
	for _, shop in folder:GetChildren() do
		if shop:IsA("BasePart") and (shop.Position - pos).Magnitude <= Mods.ShopRadius then
			return true
		end
	end
	return false
end

-- يتأكد إن اللاعب في سيارته وعند الورشة
local function getCarAtShop(player)
	local car = CarUtil.getDrivenCar(player)
	if not car then
		return nil, "اركب سيارتك أول 🚗"
	end
	if not nearShop(car) then
		return nil, "روح لأقرب ورشة تعديل 🔧"
	end
	return car
end

local function platePrice(letters, numbers)
	local price = Mods.PlatePrice[#numbers] or 500
	local a, b, c = letters:sub(1, 1), letters:sub(2, 2), letters:sub(3, 3)
	if a == b and b == c then
		price += Mods.PlateLetterBonus
	end
	return price
end

Remotes.GetModMenu.OnServerInvoke = function(player)
	local car, err = getCarAtShop(player)
	if not car then
		return nil, err
	end
	local carId = car:GetAttribute("CarId")
	local current = PlayerData.getMods(player, carId) or {}
	local function pack(list)
		local out = {}
		for _, item in list do
			table.insert(out, { Id = item.Id, Name = item.Name, Price = item.Price, Color = item.Color })
		end
		return out
	end
	return {
		Current = current,
		Paints = pack(Mods.Paints),
		Tints = pack(Mods.Tints),
		Rims = pack(Mods.Rims),
		Letters = PlateFormat.Letters,
		PlatePrice = Mods.PlatePrice,
		PlateLetterBonus = Mods.PlateLetterBonus,
	}
end

local function buyPlate(player, carId, mods, letters, numbers)
	local ok, msg = PlateFormat.validate(letters, numbers)
	if not ok then
		return false, msg
	end
	local key = PlateFormat.key(letters, numbers)
	if mods.Plate and PlateFormat.key(mods.Plate.Letters, mods.Plate.Numbers) == key then
		return false, "هذي لوحتك أصلاً"
	end
	local price = platePrice(letters, numbers)
	local data = PlayerData.get(player)
	if not data or data.Cash < price then
		return false, "اللوحة سعرها " .. price .. " ريال وفلوسك ما تكفي 💸"
	end

	-- نحجز اللوحة لو ما أحد ماخذها
	local me = player.UserId .. ":" .. carId
	local claimed = false
	local success, err = pcall(function()
		plateStore:UpdateAsync(key, function(owner)
			if owner == nil or owner == "" or owner == me then
				claimed = true
				return me
			end
			claimed = false
			return nil -- نلغي الكتابة
		end)
	end)
	if not success then
		warn("[ModService] plate claim failed", err)
		return false, "صار خطأ، جرب بعد شوي"
	end
	if not claimed then
		return false, "اللوحة " .. key .. " محجوزة لشخص ثاني 😔"
	end
	if not PlayerData.addCash(player, -price) then
		pcall(function()
			plateStore:RemoveAsync(key)
		end)
		return false, "فلوسك ما تكفي"
	end

	-- نفك اللوحة القديمة عشان غيره ياخذها
	if mods.Plate then
		local oldKey = PlateFormat.key(mods.Plate.Letters, mods.Plate.Numbers)
		task.spawn(function()
			pcall(function()
				plateStore:UpdateAsync(oldKey, function(owner)
					if owner == me then
						return "" -- فاضية = متاحة
					end
					return nil
				end)
			end)
		end)
	end
	mods.Plate = { Letters = letters, Numbers = numbers }
	return true, "🎉 لوحتك الجديدة: " .. PlateFormat.arabicLetters(letters) .. " " .. PlateFormat.arabicNumbers(numbers)
end

Remotes.BuyMod.OnServerInvoke = function(player, kind, value, extra)
	if busy[player] then
		return false, "لحظة..."
	end
	busy[player] = true
	local ok, success, text = pcall(function()
		local car, err = getCarAtShop(player)
		if not car then
			return false, err
		end
		local carId = car:GetAttribute("CarId")
		local mods = PlayerData.getMods(player, carId)
		if not mods then
			return false, "صار خطأ"
		end

		local success, text
		if kind == "Plate" then
			success, text = buyPlate(player, carId, mods, value, extra)
		else
			local listName = KIND_TO_LIST[kind]
			local item = listName and typeof(value) == "string" and CarConfig.findMod(listName, value)
			if not item then
				return false, "تعديل غير موجود"
			end
			if mods[kind] == item.Id then
				return false, "هذا عندك الحين"
			end
			if not PlayerData.addCash(player, -item.Price) then
				return false, "فلوسك ما تكفي 💸"
			end
			mods[kind] = item.Id
			success, text = true, "✅ " .. item.Name .. (item.Price > 0 and (" (-" .. item.Price .. " ريال)") or "")
		end

		if success then
			CarMods.apply(car, mods)
		end
		return success, text
	end)
	busy[player] = nil
	if not ok then
		warn("[ModService]", success)
		return false, "صار خطأ"
	end
	return success, text
end
