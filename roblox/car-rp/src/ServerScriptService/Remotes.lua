-- ModuleScript: ServerScriptService > Remotes
-- ينشئ كل RemoteEvents/RemoteFunctions في ReplicatedStorage > Remotes.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local folder = Instance.new("Folder")
folder.Name = "Remotes"

local Remotes = {}

local function make(className, name)
	local remote = Instance.new(className)
	remote.Name = name
	remote.Parent = folder
	Remotes[name] = remote
end

make("RemoteFunction", "GetCarMenu")  -- العميل يطلب قائمة السيارات
make("RemoteFunction", "BuyCar")      -- شراء سيارة
make("RemoteFunction", "SpawnCar")    -- تطليع سيارة
make("RemoteEvent", "DespawnCar")     -- شيل السيارة
make("RemoteFunction", "StartDelivery") -- بدء مهمة توصيل
make("RemoteEvent", "DeliveryUpdate") -- السيرفر يخبر العميل بالوجهة / النهاية
make("RemoteFunction", "GetModMenu") -- قائمة الورشة لسيارتك الحالية
make("RemoteFunction", "BuyMod")     -- شراء صبغ/تظليل/جنوط/لوحة
make("RemoteEvent", "Notify")         -- رسالة على الشاشة

folder.Parent = ReplicatedStorage

return Remotes
