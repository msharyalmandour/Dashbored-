-- ModuleScript: ServerScriptService > CarMods
-- يطبّق التعديلات (صبغ، تظليل، جنوط، لوحة) على موديل السيارة.
--
-- كيف يعرف وش كل قطعة؟ حط Attribute اسمه "Mod" (نوعه string) على القطعة:
--   Body  = بودي ينصبغ        Glass = زجاج يتظلّل
--   Rim   = جنط               Plate = لوحة (قدّام وورا)
-- أو سمِّ القطعة نفسها: Body / Paint / Glass / Window / Rim / Plate

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local CarConfig = require(ReplicatedStorage:WaitForChild("CarConfig"))
local PlateFormat = require(ReplicatedStorage:WaitForChild("PlateFormat"))

local NAME_TO_KIND = {
	Body = "Body", Paint = "Body",
	Glass = "Glass", Window = "Glass", Windshield = "Glass",
	Rim = "Rim",
	Plate = "Plate",
}

local CarMods = {}

local function kindOf(part)
	return part:GetAttribute("Mod") or NAME_TO_KIND[part.Name]
end

local function label(parent, text, size, pos, textColor, font)
	local l = Instance.new("TextLabel")
	l.BackgroundTransparency = 1
	l.Size = size
	l.Position = pos
	l.Text = text
	l.TextScaled = true
	l.Font = font or Enum.Font.GothamBold
	l.TextColor3 = textColor or Color3.fromRGB(20, 20, 20)
	l.Parent = parent
	return l
end

-- لوحة بتصميم قريب من اللوحة السعودية:
-- فوق: أرقام عربية | حروف عربية — تحت: أرقام لاتينية | حروف لاتينية — وشريط جانبي KSA
local function buildPlate(part, plate)
	local old = part:FindFirstChild("PlateGui")
	if old then
		old:Destroy()
	end
	if not plate then
		return
	end

	local gui = Instance.new("SurfaceGui")
	gui.Name = "PlateGui"
	gui.Face = Enum.NormalId[part:GetAttribute("PlateFace") or "Front"] or Enum.NormalId.Front
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	gui.PixelsPerStud = 100
	gui.LightInfluence = 1
	gui.Parent = part

	local bg = Instance.new("Frame")
	bg.Size = UDim2.fromScale(1, 1)
	bg.BackgroundColor3 = Color3.fromRGB(245, 245, 240)
	bg.BorderSizePixel = 0
	bg.Parent = gui
	local stroke = Instance.new("UIStroke")
	stroke.Thickness = 4
	stroke.Color = Color3.fromRGB(20, 20, 20)
	stroke.Parent = bg

	-- الشريط الجانبي (يمين)
	local strip = Instance.new("Frame")
	strip.Size = UDim2.fromScale(0.14, 1)
	strip.Position = UDim2.fromScale(0.86, 0)
	strip.BackgroundColor3 = Color3.fromRGB(235, 235, 230)
	strip.BorderSizePixel = 0
	strip.Parent = bg
	label(strip, "KSA", UDim2.fromScale(0.9, 0.3), UDim2.fromScale(0.05, 0.6))

	local ink = Color3.fromRGB(20, 20, 20)
	local area = Instance.new("Frame")
	area.BackgroundTransparency = 1
	area.Size = UDim2.fromScale(0.86, 1)
	area.Parent = bg

	-- خط وسط وخط فاصل
	local h = Instance.new("Frame")
	h.Size = UDim2.new(1, 0, 0, 3)
	h.Position = UDim2.fromScale(0, 0.5)
	h.BackgroundColor3 = ink
	h.BorderSizePixel = 0
	h.Parent = area
	local v = Instance.new("Frame")
	v.Size = UDim2.new(0, 3, 1, 0)
	v.Position = UDim2.fromScale(0.5, 0)
	v.BackgroundColor3 = ink
	v.BorderSizePixel = 0
	v.Parent = area

	local L, N = plate.Letters, plate.Numbers
	label(area, PlateFormat.arabicNumbers(N), UDim2.fromScale(0.46, 0.42), UDim2.fromScale(0.02, 0.04), ink)
	label(area, PlateFormat.arabicLetters(L), UDim2.fromScale(0.46, 0.42), UDim2.fromScale(0.52, 0.04), ink)
	label(area, PlateFormat.latinNumbers(N), UDim2.fromScale(0.46, 0.4), UDim2.fromScale(0.02, 0.55), ink)
	label(area, PlateFormat.latinLetters(L), UDim2.fromScale(0.46, 0.4), UDim2.fromScale(0.52, 0.55), ink)
end

function CarMods.apply(model, mods)
	mods = mods or {}
	local paint = mods.Paint and CarConfig.findMod("Paints", mods.Paint)
	local tint = CarConfig.findMod("Tints", mods.Tint or "None")
	local rim = CarConfig.findMod("Rims", mods.Rim or "Silver")

	for _, part in model:GetDescendants() do
		if part:IsA("BasePart") then
			local kind = kindOf(part)
			if kind == "Body" and paint then
				part.Color = paint.Color
				part.Reflectance = paint.Gloss
				-- المطفي نخليه SmoothPlastic بدون لمعة، واللامع نفس الشي مع Reflectance
				if part:IsA("Part") or part:IsA("MeshPart") then
					part.Material = Enum.Material.SmoothPlastic
				end
			elseif kind == "Glass" and tint then
				part.Transparency = tint.Transparency
				part.Color = Color3.fromRGB(25, 30, 35)
				part.Material = Enum.Material.Glass
			elseif kind == "Rim" and rim then
				part.Color = rim.Color
				part.Material = Enum.Material.Metal
			elseif kind == "Plate" then
				buildPlate(part, mods.Plate)
			end
		end
	end
end

return CarMods
