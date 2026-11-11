-- إضاءة واقعية بطابع جدة (غروب على البحر)
-- طريقة الاستخدام: في Roblox Studio افتح View > Command Bar، الصق الكود كله، واضغط Enter.
-- مرّة وحدة بس. بعدها تقدر تعدّل القيم يدوي من Lighting.

local Lighting = game:GetService("Lighting")

pcall(function()
	Lighting.Technology = Enum.Technology.Future -- أعلى جودة إضاءة وظلال
end)
Lighting.ClockTime = 17.6            -- غروب. خلّها 20.5 لليل الكورنيش
Lighting.GeographicLatitude = 21.5   -- خط عرض جدة، عشان الشمس تكون بمكانها الصح
Lighting.Brightness = 3
Lighting.EnvironmentDiffuseScale = 1
Lighting.EnvironmentSpecularScale = 1 -- انعكاسات على السيارات
Lighting.GlobalShadows = true
Lighting.ShadowSoftness = 0.15
Lighting.Ambient = Color3.fromRGB(40, 34, 30)
Lighting.OutdoorAmbient = Color3.fromRGB(120, 100, 85)
Lighting.ExposureCompensation = 0.1

local function fresh(className)
	for _, old in Lighting:GetChildren() do
		if old.ClassName == className then
			old:Destroy()
		end
	end
	local obj = Instance.new(className)
	obj.Parent = Lighting
	return obj
end

local atmosphere = fresh("Atmosphere") -- غبار وحرارة جدة الخفيفة
atmosphere.Density = 0.32
atmosphere.Offset = 0.2
atmosphere.Color = Color3.fromRGB(230, 200, 165)
atmosphere.Decay = Color3.fromRGB(150, 110, 90)
atmosphere.Glare = 0.6
atmosphere.Haze = 1.6

local sky = fresh("Sky")
sky.SunAngularSize = 14
sky.CelestialBodiesShown = true

local bloom = fresh("BloomEffect")
bloom.Intensity = 0.6
bloom.Size = 28
bloom.Threshold = 1.6

local rays = fresh("SunRaysEffect")
rays.Intensity = 0.06
rays.Spread = 0.7

local cc = fresh("ColorCorrectionEffect")
cc.Brightness = 0.02
cc.Contrast = 0.08
cc.Saturation = 0.12
cc.TintColor = Color3.fromRGB(255, 244, 232) -- دفء خفيف

local dof = fresh("DepthOfFieldEffect") -- خلفية ناعمة شوي زي الكاميرا
dof.FarIntensity = 0.12
dof.FocusDistance = 60
dof.InFocusRadius = 80
dof.NearIntensity = 0

-- البحر: موية فيروزي غامق لامعة
local terrain = workspace:FindFirstChildOfClass("Terrain")
if terrain then
	terrain.WaterColor = Color3.fromRGB(18, 92, 110)
	terrain.WaterReflectance = 0.9
	terrain.WaterTransparency = 0.35
	terrain.WaterWaveSize = 0.12
	terrain.WaterWaveSpeed = 8
end

print("✅ الإضاءة الواقعية جاهزة. Technology =", Lighting.Technology)
