-- ModuleScript: ReplicatedStorage > CarConfig
-- كل إعدادات اللعبة في مكان واحد. عدّل الأسعار والسيارات من هنا.

local CarConfig = {}

CarConfig.StartingCash = 5000 -- فلوس اللاعب الجديد

-- راتب تلقائي لكل اللاعبين
CarConfig.Paycheck = {
	Amount = 250,   -- كم ريال
	Interval = 300, -- كل كم ثانية (300 = 5 دقايق)
}

-- مهمة التوصيل
CarConfig.Delivery = {
	BaseReward = 150,    -- مكافأة ثابتة
	PerStud = 0.4,       -- زيادة حسب المسافة
	MaxReward = 1500,
	ArriveRadius = 18,   -- كم قريب لازم توصل
	MaxSpeed = 160,      -- أقصى سرعة معقولة (studs/s) — ضد الغش بالتنقّل
}

CarConfig.SpawnCooldown = 5 -- ثواني بين كل مرة تطلّع سيارة

-- Model = اسم الموديل داخل ServerStorage > Cars (لازم يطابق بالضبط)
-- Price = 0 يعني السيارة مجانية ويملكها كل لاعب
CarConfig.Cars = {
	{ Id = "Sedan",  Name = "سيدان",  Price = 0,     Model = "Sedan" },
	{ Id = "Pickup", Name = "ونيت",   Price = 8000,  Model = "Pickup" },
	{ Id = "SUV",    Name = "جيب",    Price = 15000, Model = "SUV" },
	{ Id = "Sports", Name = "سبورت",  Price = 40000, Model = "Sports" },
}

-------------------------------------------------- ورشة التعديل
-- Id يتخزن في الحفظ — لا تغيّره بعد ما تنشر اللعبة (غيّر الاسم والسعر عادي)
CarConfig.Mods = {
	ShopRadius = 30, -- كم قريب لازم تكون من ورشة (Workspace > ModShops)

	Paints = {
		{ Id = "PearlWhite", Name = "أبيض لؤلؤي", Color = Color3.fromRGB(236, 236, 230), Gloss = 0.12, Price = 500 },
		{ Id = "Black",      Name = "أسود ملكي",  Color = Color3.fromRGB(14, 14, 16),    Gloss = 0.15, Price = 500 },
		{ Id = "Silver",     Name = "فضي",        Color = Color3.fromRGB(170, 172, 176), Gloss = 0.12, Price = 500 },
		{ Id = "Graphite",   Name = "رصاصي",      Color = Color3.fromRGB(70, 72, 76),    Gloss = 0.1,  Price = 500 },
		{ Id = "Sand",       Name = "رملي",       Color = Color3.fromRGB(196, 170, 128), Gloss = 0.08, Price = 700 },
		{ Id = "Corniche",   Name = "أزرق كورنيش", Color = Color3.fromRGB(28, 78, 140),  Gloss = 0.12, Price = 700 },
		{ Id = "Maroon",     Name = "عنابي",      Color = Color3.fromRGB(110, 18, 30),   Gloss = 0.12, Price = 700 },
		{ Id = "Champagne",  Name = "شامبين",     Color = Color3.fromRGB(200, 180, 140), Gloss = 0.14, Price = 900 },
		{ Id = "Olive",      Name = "زيتي مطفي",  Color = Color3.fromRGB(82, 88, 60),    Gloss = 0,    Price = 1200 },
		{ Id = "MatteBlack", Name = "أسود مطفي",  Color = Color3.fromRGB(28, 28, 28),    Gloss = 0,    Price = 1500 },
	},

	-- Transparency للزجاج: أقل = أغمق
	Tints = {
		{ Id = "None",   Name = "بدون تظليل", Transparency = 0.6,  Price = 0 },
		{ Id = "Light",  Name = "خفيف 30%",   Transparency = 0.45, Price = 300 },
		{ Id = "Medium", Name = "وسط 50%",    Transparency = 0.3,  Price = 400 },
		{ Id = "Dark",   Name = "غامق 70%",   Transparency = 0.15, Price = 600 },
	},

	Rims = {
		{ Id = "Silver",   Name = "فضي",       Color = Color3.fromRGB(190, 190, 195), Price = 0 },
		{ Id = "Black",    Name = "أسود",      Color = Color3.fromRGB(20, 20, 20),    Price = 400 },
		{ Id = "Gold",     Name = "ذهبي",      Color = Color3.fromRGB(201, 160, 70),  Price = 800 },
		{ Id = "Bronze",   Name = "برونزي",    Color = Color3.fromRGB(130, 90, 55),   Price = 600 },
		{ Id = "Gunmetal", Name = "رمادي غامق", Color = Color3.fromRGB(60, 62, 66),   Price = 500 },
	},

	-- سعر اللوحة حسب عدد الأرقام (أقل أرقام = أندر = أغلى)
	PlatePrice = { [1] = 100000, [2] = 25000, [3] = 5000, [4] = 500 },
	PlateLetterBonus = 2000, -- زيادة لو الحروف الثلاثة نفس الحرف (مثل ح ح ح)
}

function CarConfig.findMod(kind, id)
	for _, item in CarConfig.Mods[kind] or {} do
		if item.Id == id then
			return item
		end
	end
	return nil
end

function CarConfig.get(id)
	for _, car in CarConfig.Cars do
		if car.Id == id then
			return car
		end
	end
	return nil
end

return CarConfig
