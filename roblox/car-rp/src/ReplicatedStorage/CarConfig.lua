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

function CarConfig.get(id)
	for _, car in CarConfig.Cars do
		if car.Id == id then
			return car
		end
	end
	return nil
end

return CarConfig
