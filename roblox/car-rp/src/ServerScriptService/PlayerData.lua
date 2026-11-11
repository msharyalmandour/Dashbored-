-- ModuleScript: ServerScriptService > PlayerData
-- يحفظ فلوس اللاعب وسياراته في DataStore.

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local CarConfig = require(ReplicatedStorage:WaitForChild("CarConfig"))

local store = DataStoreService:GetDataStore("CarRP_v1")
local cache = {} -- [player] = data

local PlayerData = {}

local function key(player)
	return "u_" .. player.UserId
end

local function load(player)
	local ok, saved = pcall(function()
		return store:GetAsync(key(player))
	end)

	local data
	if ok then
		data = saved or {}
	else
		-- إذا فشل التحميل لا نحفظ فوق بياناته القديمة
		warn("[PlayerData] فشل تحميل بيانات", player.Name, saved)
		data = { _loadFailed = true }
	end

	data.Cash = data.Cash or CarConfig.StartingCash
	data.Cars = data.Cars or {}
	data.Mods = data.Mods or {} -- [carId] = { Paint, Tint, Rim, Plate = { Letters, Numbers } }
	for _, car in CarConfig.Cars do
		if car.Price == 0 then
			data.Cars[car.Id] = true
		end
	end

	if not player.Parent then
		return
	end
	cache[player] = data

	local leaderstats = Instance.new("Folder")
	leaderstats.Name = "leaderstats"
	local cash = Instance.new("IntValue")
	cash.Name = "Cash"
	cash.Value = data.Cash
	cash.Parent = leaderstats
	leaderstats.Parent = player
end

local function save(player)
	local data = cache[player]
	if not data or data._loadFailed then
		return
	end
	local ok, err = pcall(function()
		store:SetAsync(key(player), { Cash = data.Cash, Cars = data.Cars, Mods = data.Mods })
	end)
	if not ok then
		warn("[PlayerData] فشل الحفظ", player.Name, err)
	end
end

-- ينتظر لين تتحمّل بيانات اللاعب (أو يطلع من السيرفر)
function PlayerData.get(player)
	while player.Parent and not cache[player] do
		task.wait()
	end
	return cache[player]
end

function PlayerData.addCash(player, amount)
	local data = PlayerData.get(player)
	if not data or data.Cash + amount < 0 then
		return false
	end
	data.Cash += amount
	local leaderstats = player:FindFirstChild("leaderstats")
	if leaderstats then
		leaderstats.Cash.Value = data.Cash
	end
	return true
end

function PlayerData.ownsCar(player, carId)
	local data = PlayerData.get(player)
	return data ~= nil and data.Cars[carId] == true
end

function PlayerData.giveCar(player, carId)
	local data = PlayerData.get(player)
	if data then
		data.Cars[carId] = true
	end
end

-- تعديلات سيارة معيّنة (ينشئ جدول فاضي إذا ما فيه)
function PlayerData.getMods(player, carId)
	local data = PlayerData.get(player)
	if not data then
		return nil
	end
	data.Mods[carId] = data.Mods[carId] or {}
	return data.Mods[carId]
end

Players.PlayerAdded:Connect(load)
for _, player in Players:GetPlayers() do
	task.spawn(load, player)
end

Players.PlayerRemoving:Connect(function(player)
	save(player)
	cache[player] = nil
end)

-- حفظ تلقائي كل دقيقتين
task.spawn(function()
	while true do
		task.wait(120)
		for player in cache do
			task.spawn(save, player)
		end
	end
end)

game:BindToClose(function()
	for player in cache do
		save(player)
	end
end)

return PlayerData
