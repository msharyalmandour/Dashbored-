-- Script: ServerScriptService > JobService
-- الراتب التلقائي + مهمة التوصيل.
-- لازم تحط Parts داخل Folder اسمه DeliveryPoints في Workspace (أماكن التوصيل).

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local CarConfig = require(ReplicatedStorage:WaitForChild("CarConfig"))
local PlayerData = require(script.Parent:WaitForChild("PlayerData"))
local Remotes = require(script.Parent:WaitForChild("Remotes"))

local cfg = CarConfig.Delivery
local jobs = {} -- [player] = { Point = Part, StartPos = Vector3, StartTime = number }

local function notify(player, text)
	Remotes.Notify:FireClient(player, text)
end

local function getRoot(player)
	local character = player.Character
	return character and character:FindFirstChild("HumanoidRootPart")
end

-- هل اللاعب راكب سيارته هو؟
local function isDrivingOwnCar(player)
	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	local seat = humanoid and humanoid.SeatPart
	if not seat or not seat:IsA("VehicleSeat") then
		return false
	end
	local car = seat:FindFirstAncestorOfClass("Model")
	while car and car:GetAttribute("OwnerUserId") == nil do
		car = car:FindFirstAncestorOfClass("Model")
	end
	return car ~= nil and car:GetAttribute("OwnerUserId") == player.UserId
end

-------------------------------------------------- الراتب
task.spawn(function()
	while true do
		task.wait(CarConfig.Paycheck.Interval)
		for _, player in Players:GetPlayers() do
			if PlayerData.addCash(player, CarConfig.Paycheck.Amount) then
				notify(player, "💰 نزل راتبك: " .. CarConfig.Paycheck.Amount .. " ريال")
			end
		end
	end
end)

-------------------------------------------------- التوصيل
Remotes.StartDelivery.OnServerInvoke = function(player)
	if jobs[player] then
		return false, "عندك توصيلة شغالة"
	end
	if not isDrivingOwnCar(player) then
		return false, "اركب سيارتك أول 🚗"
	end
	local folder = workspace:FindFirstChild("DeliveryPoints")
	local points = folder and folder:GetChildren() or {}
	local root = getRoot(player)
	if #points == 0 or not root then
		return false, "ما فيه أماكن توصيل بالماب"
	end

	-- نختار مكان بعيد شوي عن اللاعب
	local candidates = {}
	for _, p in points do
		if p:IsA("BasePart") and (p.Position - root.Position).Magnitude > 100 then
			table.insert(candidates, p)
		end
	end
	if #candidates == 0 then
		candidates = points
	end
	local point = candidates[math.random(1, #candidates)]

	jobs[player] = { Point = point, StartPos = root.Position, StartTime = os.clock() }
	Remotes.DeliveryUpdate:FireClient(player, "start", point.Position)
	return true, "📦 وصّل الطلب للمكان المحدد"
end

-- نشيك كل نص ثانية إذا أحد وصل
task.spawn(function()
	while true do
		task.wait(0.5)
		for player, job in jobs do
			local root = getRoot(player)
			if not player.Parent or not job.Point.Parent then
				jobs[player] = nil
			elseif root and (root.Position - job.Point.Position).Magnitude <= cfg.ArriveRadius then
				jobs[player] = nil
				local distance = (job.Point.Position - job.StartPos).Magnitude
				local elapsed = os.clock() - job.StartTime
				if elapsed < distance / cfg.MaxSpeed then
					notify(player, "وصلت بسرعة مو طبيعية 🤨 ما انحسبت")
				else
					local reward = math.min(cfg.MaxReward, math.floor(cfg.BaseReward + distance * cfg.PerStud))
					PlayerData.addCash(player, reward)
					notify(player, "✅ تم التوصيل! +" .. reward .. " ريال")
				end
				Remotes.DeliveryUpdate:FireClient(player, "done")
			end
		end
	end
end)

Players.PlayerRemoving:Connect(function(player)
	jobs[player] = nil
end)
