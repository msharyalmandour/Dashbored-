-- LocalScript: StarterPlayer > StarterPlayerScripts > ModMenu
-- واجهة ورشة التعديل: صبغ، تظليل، جنوط، لوحة عربية. اختصار: زر M

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local PlateFormat = require(ReplicatedStorage:WaitForChild("PlateFormat"))

local ORANGE = Color3.fromRGB(255, 106, 0)
local DARK = Color3.fromRGB(18, 18, 18)
local PANEL = Color3.fromRGB(30, 30, 30)
local WHITE = Color3.new(1, 1, 1)

local function corner(parent, r)
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, r or 8)
	c.Parent = parent
end

local function text(parent, str, size)
	local l = Instance.new("TextLabel")
	l.BackgroundTransparency = 1
	l.TextColor3 = WHITE
	l.Font = Enum.Font.GothamBold
	l.TextSize = size or 18
	l.Text = str
	l.Parent = parent
	return l
end

local function button(parent, str, color)
	local b = Instance.new("TextButton")
	b.Text = str
	b.Font = Enum.Font.GothamBold
	b.TextSize = 17
	b.TextColor3 = WHITE
	b.BackgroundColor3 = color or ORANGE
	b.Parent = parent
	corner(b)
	return b
end

-------------------------------------------------- الهيكل
local gui = Instance.new("ScreenGui")
gui.Name = "ModShop"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.Parent = player:WaitForChild("PlayerGui")

local openBtn = button(gui, "🔧 الورشة (M)", PANEL)
openBtn.Size = UDim2.fromOffset(170, 46)
openBtn.Position = UDim2.new(0, 16, 1, -174)

local menu = Instance.new("Frame")
menu.AnchorPoint = Vector2.new(0.5, 0.5)
menu.Position = UDim2.fromScale(0.5, 0.5)
menu.Size = UDim2.fromOffset(480, 460)
menu.BackgroundColor3 = DARK
menu.Visible = false
menu.Parent = gui
corner(menu, 14)
local stroke = Instance.new("UIStroke")
stroke.Color = ORANGE
stroke.Thickness = 2
stroke.Parent = menu

local title = text(menu, "ورشة التعديل 🔧", 22)
title.Size = UDim2.new(1, 0, 0, 40)
title.Position = UDim2.fromOffset(0, 6)

local status = text(menu, "", 16)
status.TextColor3 = ORANGE
status.Size = UDim2.new(1, -20, 0, 24)
status.Position = UDim2.new(0, 10, 1, -84)
status.TextWrapped = true

local closeBtn = button(menu, "✖ قفل", PANEL)
closeBtn.Size = UDim2.new(1, -20, 0, 44)
closeBtn.Position = UDim2.new(0, 10, 1, -54)

-- التبويبات
local tabsBar = Instance.new("Frame")
tabsBar.BackgroundTransparency = 1
tabsBar.Size = UDim2.new(1, -20, 0, 40)
tabsBar.Position = UDim2.fromOffset(10, 48)
tabsBar.Parent = menu
local tabsLayout = Instance.new("UIListLayout")
tabsLayout.FillDirection = Enum.FillDirection.Horizontal
tabsLayout.Padding = UDim.new(0, 6)
tabsLayout.Parent = tabsBar

local content = Instance.new("ScrollingFrame")
content.BackgroundTransparency = 1
content.Size = UDim2.new(1, -20, 1, -186)
content.Position = UDim2.fromOffset(10, 96)
content.ScrollBarThickness = 6
content.AutomaticCanvasSize = Enum.AutomaticSize.Y
content.CanvasSize = UDim2.new()
content.Parent = menu

local menuData
local currentTab = "Paint"
local render -- forward

local function clearContent()
	for _, c in content:GetChildren() do
		c:Destroy()
	end
end

local function buy(kind, value, extra)
	status.Text = "..."
	local ok, msg = Remotes.BuyMod:InvokeServer(kind, value, extra)
	status.Text = msg or ""
	if ok then
		menuData.Current[kind] = kind == "Plate" and { Letters = value, Numbers = extra } or value
		render()
	end
end

-- شبكة ألوان (صبغ/تظليل/جنوط)
local function renderSwatches(kind, items)
	local grid = Instance.new("UIGridLayout")
	grid.CellSize = UDim2.fromOffset(140, 84)
	grid.CellPadding = UDim2.fromOffset(8, 8)
	grid.Parent = content

	for _, item in items do
		local selected = menuData.Current[kind] == item.Id
			or (menuData.Current[kind] == nil and item.Price == 0 and kind ~= "Paint")
		local cell = button(content, "", PANEL)
		local s = Instance.new("UIStroke")
		s.Color = selected and ORANGE or Color3.fromRGB(60, 60, 60)
		s.Thickness = selected and 3 or 1
		s.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
		s.Parent = cell

		local sw = Instance.new("Frame")
		sw.Size = UDim2.new(1, -16, 0, 30)
		sw.Position = UDim2.fromOffset(8, 8)
		sw.BackgroundColor3 = item.Color or Color3.fromRGB(25, 30, 35)
		if kind == "Tint" then
			-- نوضّح درجة التظليل
			local t = ({ None = 0.85, Light = 0.55, Medium = 0.3, Dark = 0.05 })[item.Id] or 0.5
			sw.BackgroundTransparency = t
		end
		sw.Parent = cell
		corner(sw, 6)

		local name = text(cell, item.Name, 15)
		name.Size = UDim2.new(1, 0, 0, 20)
		name.Position = UDim2.fromOffset(0, 42)
		local price = text(cell, selected and "✔ مركّب" or (item.Price == 0 and "مجاني" or item.Price .. " ريال"), 14)
		price.TextColor3 = selected and ORANGE or Color3.fromRGB(180, 180, 180)
		price.Size = UDim2.new(1, 0, 0, 18)
		price.Position = UDim2.fromOffset(0, 62)

		cell.Activated:Connect(function()
			if not selected then
				buy(kind, item.Id)
			end
		end)
	end
end

-- تبويب اللوحة
local function renderPlate()
	local letters = { 1, 2, 3 } -- مؤشرات داخل PlateFormat.Letters
	local cur = menuData.Current.Plate
	if cur then
		for i = 1, 3 do
			for idx, l in PlateFormat.Letters do
				if l.En == cur.Letters:sub(i, i) then
					letters[i] = idx
				end
			end
		end
	end

	local preview = Instance.new("Frame")
	preview.Size = UDim2.new(1, -8, 0, 90)
	preview.BackgroundColor3 = Color3.fromRGB(245, 245, 240)
	preview.Parent = content
	corner(preview, 6)
	local function previewLabel(pos)
		local l = text(preview, "", 30)
		l.TextColor3 = Color3.fromRGB(20, 20, 20)
		l.Size = UDim2.fromScale(0.5, 0.5)
		l.Position = pos
		return l
	end
	local arNum = previewLabel(UDim2.fromScale(0, 0))
	local arLet = previewLabel(UDim2.fromScale(0.5, 0))
	local enNum = previewLabel(UDim2.fromScale(0, 0.5))
	local enLet = previewLabel(UDim2.fromScale(0.5, 0.5))

	-- اختيار الحروف (الحرف الأول يمين)
	local row = Instance.new("Frame")
	row.BackgroundTransparency = 1
	row.Size = UDim2.new(1, -8, 0, 50)
	row.Position = UDim2.fromOffset(0, 100)
	row.Parent = content

	local numBox = Instance.new("TextBox")
	numBox.Size = UDim2.new(1, -8, 0, 44)
	numBox.Position = UDim2.fromOffset(0, 160)
	numBox.BackgroundColor3 = PANEL
	numBox.TextColor3 = WHITE
	numBox.PlaceholderText = "الأرقام (1 إلى 4 أرقام)"
	numBox.Font = Enum.Font.GothamBold
	numBox.TextSize = 20
	numBox.ClearTextOnFocus = false
	numBox.Text = cur and cur.Numbers or ""
	numBox.Parent = content
	corner(numBox)

	local buyBtn = button(content, "", ORANGE)
	buyBtn.Size = UDim2.new(1, -8, 0, 44)
	buyBtn.Position = UDim2.fromOffset(0, 214)

	local function latin()
		local s = ""
		for i = 1, 3 do
			s ..= PlateFormat.Letters[letters[i]].En
		end
		return s
	end

	local function update()
		local L, N = latin(), numBox.Text
		arLet.Text = PlateFormat.arabicLetters(L)
		enLet.Text = PlateFormat.latinLetters(L)
		local valid, why = PlateFormat.validate(L, N)
		if N:match("^%d+$") then
			arNum.Text = PlateFormat.arabicNumbers(N)
			enNum.Text = PlateFormat.latinNumbers(N)
		else
			arNum.Text, enNum.Text = "", ""
		end
		if valid then
			local price = menuData.PlatePrice[#N] or 500
			if L:sub(1, 1) == L:sub(2, 2) and L:sub(2, 2) == L:sub(3, 3) then
				price += menuData.PlateLetterBonus
			end
			buyBtn.Text = "احجز اللوحة — " .. price .. " ريال"
			buyBtn.AutoButtonColor = true
			buyBtn.BackgroundColor3 = ORANGE
		else
			buyBtn.Text = why
			buyBtn.BackgroundColor3 = Color3.fromRGB(60, 60, 60)
		end
	end

	-- 3 خانات حروف، نرتبها من اليمين لليسار
	for i = 1, 3 do
		local slot = Instance.new("Frame")
		slot.BackgroundColor3 = PANEL
		slot.Size = UDim2.new(1 / 3, -6, 1, 0)
		slot.Position = UDim2.new((3 - i) / 3, 0, 0, 0)
		slot.Parent = row
		corner(slot)
		local prev = button(slot, "◀", Color3.fromRGB(50, 50, 50))
		prev.Size = UDim2.new(0, 34, 1, -8)
		prev.Position = UDim2.fromOffset(4, 4)
		local nxt = button(slot, "▶", Color3.fromRGB(50, 50, 50))
		nxt.Size = UDim2.new(0, 34, 1, -8)
		nxt.Position = UDim2.new(1, -38, 0, 4)
		local show = text(slot, "", 24)
		show.Size = UDim2.new(1, -80, 1, 0)
		show.Position = UDim2.fromOffset(40, 0)
		local function refreshSlot()
			show.Text = PlateFormat.Letters[letters[i]].Ar
			update()
		end
		prev.Activated:Connect(function()
			letters[i] = (letters[i] - 2) % #PlateFormat.Letters + 1
			refreshSlot()
		end)
		nxt.Activated:Connect(function()
			letters[i] = letters[i] % #PlateFormat.Letters + 1
			refreshSlot()
		end)
		refreshSlot()
	end

	numBox:GetPropertyChangedSignal("Text"):Connect(function()
		local clean = numBox.Text:gsub("%D", ""):sub(1, 4)
		if clean ~= numBox.Text then
			numBox.Text = clean
		end
		update()
	end)

	buyBtn.Activated:Connect(function()
		local L, N = latin(), numBox.Text
		if PlateFormat.validate(L, N) then
			buy("Plate", L, N)
		end
	end)
	update()
end

local TABS = {
	{ Id = "Paint", Name = "🎨 صبغ" },
	{ Id = "Tint", Name = "🕶️ تظليل" },
	{ Id = "Rim", Name = "🛞 جنوط" },
	{ Id = "Plate", Name = "🔢 لوحة" },
}
local tabButtons = {}

render = function()
	clearContent()
	for id, b in tabButtons do
		b.BackgroundColor3 = id == currentTab and ORANGE or PANEL
	end
	if currentTab == "Paint" then
		renderSwatches("Paint", menuData.Paints)
	elseif currentTab == "Tint" then
		renderSwatches("Tint", menuData.Tints)
	elseif currentTab == "Rim" then
		renderSwatches("Rim", menuData.Rims)
	else
		renderPlate()
	end
end

for _, tab in TABS do
	local b = button(tabsBar, tab.Name, PANEL)
	b.Size = UDim2.new(0.25, -5, 1, 0)
	tabButtons[tab.Id] = b
	b.Activated:Connect(function()
		currentTab = tab.Id
		render()
	end)
end

-------------------------------------------------- فتح/قفل
local opening = false
local function open()
	if opening then
		return
	end
	opening = true
	local data, err = Remotes.GetModMenu:InvokeServer()
	opening = false
	if not data then
		-- نعرض السبب على الزر شوي
		openBtn.Text = err or "ما تقدر الحين"
		task.delay(2.5, function()
			openBtn.Text = "🔧 الورشة (M)"
		end)
		return
	end
	menuData = data
	status.Text = ""
	menu.Visible = true
	render()
end

openBtn.Activated:Connect(function()
	if menu.Visible then
		menu.Visible = false
	else
		open()
	end
end)
closeBtn.Activated:Connect(function()
	menu.Visible = false
end)
UserInputService.InputBegan:Connect(function(input, processed)
	if not processed and input.KeyCode == Enum.KeyCode.M then
		if menu.Visible then
			menu.Visible = false
		else
			open()
		end
	end
end)

-- لو نزل من السيارة نقفل الورشة
task.spawn(function()
	while true do
		task.wait(1)
		if menu.Visible then
			local hum = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
			if not hum or not hum.SeatPart then
				menu.Visible = false
			end
		end
	end
end)
