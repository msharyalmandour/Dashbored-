-- Script: ServerScriptService > CarService
-- المعرض (شراء) + تطليع السيارات + قفل كرسي السواق على صاحب السيارة.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerStorage = game:GetService("ServerStorage")

local CarConfig = require(ReplicatedStorage:WaitForChild("CarConfig"))
local PlayerData = require(script.Parent:WaitForChild("PlayerData"))
local Remotes = require(script.Parent:WaitForChild("Remotes"))

local carModels = ServerStorage:WaitForChild("Cars")

local spawnedFolder = Instance.new("Folder")
spawnedFolder.Name = "SpawnedCars"
spawnedFolder.Parent = workspace

local activeCar = {}  -- [player] = Model
local lastSpawn = {}  -- [player] = os.clock()

local function notify(player, text)
	Remotes.Notify:FireClient(player, text)
end

local function despawn(player)
	local car = activeCar[player]
	if car then
		car:Destroy()
		activeCar[player] = nil
	end
end

-- بس صاحب السيارة يقدر يسوق
local function lockDriverSeat(car, owner)
	local seat = car:FindFirstChildWhichIsA("VehicleSeat", true)
	if not seat then
		return nil
	end
	seat:GetPropertyChangedSignal("Occupant"):Connect(function()
		local humanoid = seat.Occupant
		if not humanoid then
			return
		end
		local who = Players:GetPlayerFromCharacter(humanoid.Parent)
		if who ~= owner then
			local weld = seat:FindFirstChild("SeatWeld")
			if weld then
				weld:Destroy()
			end
			humanoid.Sit = false
			humanoid.Jump = true
			if who then
				notify(who, "هذي السيارة مو حقتك 🔒")
			end
		end
	end)
	return seat
end

Remotes.GetCarMenu.OnServerInvoke = function(player)
	local data = PlayerData.get(player)
	if not data then
		return nil
	end
	local list = {}
	for _, car in CarConfig.Cars do
		table.insert(list, {
			Id = car.Id,
			Name = car.Name,
			Price = car.Price,
			Owned = data.Cars[car.Id] == true,
		})
	end
	return { Cash = data.Cash, Cars = list }
end

Remotes.BuyCar.OnServerInvoke = function(player, carId)
	local car = typeof(carId) == "string" and CarConfig.get(carId)
	if not car then
		return false, "سيارة غير موجودة"
	end
	if PlayerData.ownsCar(player, car.Id) then
		return false, "عندك هذي السيارة من قبل"
	end
	if not PlayerData.addCash(player, -car.Price) then
		return false, "فلوسك ما تكفي 💸"
	end
	PlayerData.giveCar(player, car.Id)
	return true, "مبروك! اشتريت " .. car.Name .. " 🎉"
end

Remotes.SpawnCar.OnServerInvoke = function(player, carId)
	local car = typeof(carId) == "string" and CarConfig.get(carId)
	if not car then
		return false, "سيارة غير موجودة"
	end
	if not PlayerData.ownsCar(player, car.Id) then
		return false, "لازم تشتريها أول"
	end
	local now = os.clock()
	if lastSpawn[player] and now - lastSpawn[player] < CarConfig.SpawnCooldown then
		return false, "استنى شوي قبل ما تطلّع سيارة ثانية"
	end

	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if not root or not humanoid or humanoid.Health <= 0 then
		return false, "لازم تكون عايش عشان تطلّع سيارة"
	end

	local template = carModels:FindFirstChild(car.Model)
	if not template then
		warn("[CarService] ما لقيت موديل باسم", car.Model, "داخل ServerStorage.Cars")
		return false, "موديل السيارة ناقص (كلم صاحب اللعبة)"
	end

	lastSpawn[player] = now
	despawn(player)

	local model = template:Clone()
	model.Name = player.Name .. "_" .. car.Id
	model:SetAttribute("OwnerUserId", player.UserId)
	-- نطلعها جنب اللاعب وموجهة لنفس اتجاهه
	model:PivotTo(root.CFrame * CFrame.new(10, 3, 0))
	model.Parent = spawnedFolder
	activeCar[player] = model

	local seat = lockDriverSeat(model, player)
	if seat then
		task.defer(function()
			seat:Sit(humanoid)
		end)
	end
	return true, "طلعت " .. car.Name .. " 🚗"
end

Remotes.DespawnCar.OnServerEvent:Connect(function(player)
	despawn(player)
end)

Players.PlayerRemoving:Connect(function(player)
	despawn(player)
	lastSpawn[player] = nil
end)
