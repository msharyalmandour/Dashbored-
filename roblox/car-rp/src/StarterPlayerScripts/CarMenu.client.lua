-- LocalScript: StarterPlayer > StarterPlayerScripts > CarMenu
-- واجهة المعرض/الكراج + زر التوصيل + الإشعارات. كل الواجهة تنبني بالكود.
-- اختصار: زر G يفتح ويقفل القائمة.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local TweenService = game:GetService("TweenService")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local ORANGE = Color3.fromRGB(255, 106, 0)
local DARK = Color3.fromRGB(18, 18, 18)
local PANEL = Color3.fromRGB(30, 30, 30)
local WHITE = Color3.new(1, 1, 1)

local function corner(parent, radius)
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, radius or 10)
	c.Parent = parent
end

local function button(parent, text, color)
	local b = Instance.new("TextButton")
	b.Text = text
	b.Font = Enum.Font.GothamBold
	b.TextSize = 18
	b.TextColor3 = WHITE
	b.BackgroundColor3 = color or ORANGE
	b.AutoButtonColor = true
	b.Parent = parent
	corner(b, 8)
	return b
end

-------------------------------------------------- الشاشة
local gui = Instance.new("ScreenGui")
gui.Name = "CarRP"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.Parent = player:WaitForChild("PlayerGui")

-- أزرار أسفل يسار
local carsBtn = button(gui, "🚗 السيارات (G)")
carsBtn.Size = UDim2.fromOffset(170, 46)
carsBtn.Position = UDim2.new(0, 16, 1, -66)

local jobBtn = button(gui, "📦 توصيل", PANEL)
jobBtn.Size = UDim2.fromOffset(170, 46)
jobBtn.Position = UDim2.new(0, 16, 1, -120)

-- إشعار فوق
local toast = Instance.new("TextLabel")
toast.AnchorPoint = Vector2.new(0.5, 0)
toast.Position = UDim2.new(0.5, 0, 0, 70)
toast.Size = UDim2.fromOffset(420, 48)
toast.BackgroundColor3 = DARK
toast.BackgroundTransparency = 1
toast.TextTransparency = 1
toast.TextColor3 = WHITE
toast.Font = Enum.Font.GothamBold
toast.TextSize = 20
toast.Parent = gui
corner(toast, 10)

local toastId = 0
local function showToast(text)
	toastId += 1
	local myId = toastId
	toast.Text = text
	toast.BackgroundTransparency = 0.15
	toast.TextTransparency = 0
	task.delay(3, function()
		if myId == toastId then
			local info = TweenInfo.new(0.4)
			TweenService:Create(toast, info, { BackgroundTransparency = 1, TextTransparency = 1 }):Play()
		end
	end)
end
Remotes.Notify.OnClientEvent:Connect(showToast)

-- القائمة
local menu = Instance.new("Frame")
menu.AnchorPoint = Vector2.new(0.5, 0.5)
menu.Position = UDim2.fromScale(0.5, 0.5)
menu.Size = UDim2.fromOffset(440, 420)
menu.BackgroundColor3 = DARK
menu.Visible = false
menu.Parent = gui
corner(menu, 14)
local stroke = Instance.new("UIStroke")
stroke.Color = ORANGE
stroke.Thickness = 2
stroke.Parent = menu

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, -20, 0, 44)
title.Position = UDim2.fromOffset(10, 8)
title.BackgroundTransparency = 1
title.TextColor3 = WHITE
title.Font = Enum.Font.GothamBold
title.TextSize = 22
title.Text = "المعرض والكراج"
title.Parent = menu

local cashLabel = Instance.new("TextLabel")
cashLabel.Size = UDim2.new(1, -20, 0, 24)
cashLabel.Position = UDim2.fromOffset(10, 50)
cashLabel.BackgroundTransparency = 1
cashLabel.TextColor3 = ORANGE
cashLabel.Font = Enum.Font.GothamBold
cashLabel.TextSize = 18
cashLabel.Parent = menu

local list = Instance.new("ScrollingFrame")
list.Size = UDim2.new(1, -20, 1, -150)
list.Position = UDim2.fromOffset(10, 82)
list.BackgroundTransparency = 1
list.ScrollBarThickness = 6
list.AutomaticCanvasSize = Enum.AutomaticSize.Y
list.CanvasSize = UDim2.new()
list.Parent = menu
local layout = Instance.new("UIListLayout")
layout.Padding = UDim.new(0, 8)
layout.Parent = list

local despawnBtn = button(menu, "🗑️ شيل سيارتي", PANEL)
despawnBtn.Size = UDim2.new(0.5, -15, 0, 44)
despawnBtn.Position = UDim2.new(0, 10, 1, -56)

local closeBtn = button(menu, "✖ قفل", PANEL)
closeBtn.Size = UDim2.new(0.5, -15, 0, 44)
closeBtn.Position = UDim2.new(0.5, 5, 1, -56)

local busy = false
local refresh -- forward declaration

local function addRow(car)
	local row = Instance.new("Frame")
	row.Size = UDim2.new(1, -8, 0, 56)
	row.BackgroundColor3 = PANEL
	row.Parent = list
	corner(row, 10)

	local name = Instance.new("TextLabel")
	name.Size = UDim2.new(0.6, 0, 1, 0)
	name.Position = UDim2.fromOffset(12, 0)
	name.BackgroundTransparency = 1
	name.TextXAlignment = Enum.TextXAlignment.Left
	name.TextColor3 = WHITE
	name.Font = Enum.Font.GothamBold
	name.TextSize = 18
	local priceText = car.Price == 0 and "مجانية" or (car.Price .. " ريال")
	name.Text = car.Owned and (car.Name .. "  ✔") or (car.Name .. "  —  " .. priceText)
	name.Parent = row

	local action = button(row, car.Owned and "طلّعها" or "اشتري", car.Owned and ORANGE or Color3.fromRGB(60, 60, 60))
	action.Size = UDim2.new(0.35, -12, 0, 40)
	action.Position = UDim2.new(0.65, 0, 0.5, -20)
	action.Activated:Connect(function()
		if busy then
			return
		end
		busy = true
		local remote = car.Owned and Remotes.SpawnCar or Remotes.BuyCar
		local ok, msg = remote:InvokeServer(car.Id)
		showToast(msg)
		busy = false
		if ok and car.Owned then
			menu.Visible = false
		else
			refresh()
		end
	end)
end

refresh = function()
	local data = Remotes.GetCarMenu:InvokeServer()
	if not data then
		return
	end
	cashLabel.Text = "فلوسك: " .. data.Cash .. " ريال"
	for _, child in list:GetChildren() do
		if child:IsA("Frame") then
			child:Destroy()
		end
	end
	for _, car in data.Cars do
		addRow(car)
	end
end

local function toggleMenu()
	menu.Visible = not menu.Visible
	if menu.Visible then
		refresh()
	end
end

carsBtn.Activated:Connect(toggleMenu)
closeBtn.Activated:Connect(function()
	menu.Visible = false
end)
despawnBtn.Activated:Connect(function()
	Remotes.DespawnCar:FireServer()
	showToast("شلنا سيارتك")
end)

UserInputService.InputBegan:Connect(function(input, processed)
	if not processed and input.KeyCode == Enum.KeyCode.G then
		toggleMenu()
	end
end)

-------------------------------------------------- التوصيل (علامة الوجهة)
local marker, markerConn

local function clearMarker()
	if markerConn then
		markerConn:Disconnect()
		markerConn = nil
	end
	if marker then
		marker:Destroy()
		marker = nil
	end
end

Remotes.DeliveryUpdate.OnClientEvent:Connect(function(kind, position)
	clearMarker()
	if kind ~= "start" then
		return
	end

	marker = Instance.new("Part")
	marker.Anchored = true
	marker.CanCollide = false
	marker.CanQuery = false
	marker.Material = Enum.Material.Neon
	marker.Color = ORANGE
	marker.Transparency = 0.4
	marker.Shape = Enum.PartType.Cylinder
	marker.Size = Vector3.new(1, 30, 30)
	marker.CFrame = CFrame.new(position) * CFrame.Angles(0, 0, math.rad(90))
	marker.Parent = workspace

	local bb = Instance.new("BillboardGui")
	bb.Size = UDim2.fromOffset(220, 50)
	bb.StudsOffset = Vector3.new(0, 8, 0)
	bb.AlwaysOnTop = true
	bb.Parent = marker
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundColor3 = DARK
	label.BackgroundTransparency = 0.2
	label.TextColor3 = WHITE
	label.Font = Enum.Font.GothamBold
	label.TextSize = 20
	label.Parent = bb
	corner(label, 8)

	markerConn = RunService.RenderStepped:Connect(function()
		local character = player.Character
		local root = character and character:FindFirstChild("HumanoidRootPart")
		if root then
			label.Text = "📦 التوصيل: " .. math.floor((root.Position - position).Magnitude) .. "m"
		end
	end)
end)

jobBtn.Activated:Connect(function()
	local ok, msg = Remotes.StartDelivery:InvokeServer()
	showToast(msg)
end)
