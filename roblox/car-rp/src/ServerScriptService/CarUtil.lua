-- ModuleScript: ServerScriptService > CarUtil
-- أدوات مشتركة بين السكربتات.

local CarUtil = {}

-- يرجّع موديل السيارة اللي اللاعب سايقها (لو هي سيارته)، وإلا nil
function CarUtil.getDrivenCar(player)
	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	local seat = humanoid and humanoid.SeatPart
	if not seat or not seat:IsA("VehicleSeat") then
		return nil
	end
	local car = seat:FindFirstAncestorOfClass("Model")
	while car and car:GetAttribute("OwnerUserId") == nil do
		car = car:FindFirstAncestorOfClass("Model")
	end
	if car and car:GetAttribute("OwnerUserId") == player.UserId then
		return car
	end
	return nil
end

return CarUtil
