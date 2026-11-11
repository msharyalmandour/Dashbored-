-- ModuleScript: ReplicatedStorage > PlateFormat
-- نظام اللوحة على شكل اللوحات السعودية: 3 حروف + من 1 إلى 4 أرقام،
-- مكتوبة بالعربي وتحتها المقابل اللاتيني.
-- نستخدم حروف وأرقام محددة بس (مو نص حر) عشان ما يكتب أحد كلام مو زين.

local PlateFormat = {}

-- الحروف المستخدمة في اللوحات ومقابلها اللاتيني
PlateFormat.Letters = {
	{ Ar = "ا", En = "A" }, { Ar = "ب", En = "B" }, { Ar = "ح", En = "J" },
	{ Ar = "د", En = "D" }, { Ar = "ر", En = "R" }, { Ar = "س", En = "S" },
	{ Ar = "ص", En = "X" }, { Ar = "ط", En = "T" }, { Ar = "ع", En = "E" },
	{ Ar = "ق", En = "G" }, { Ar = "ك", En = "K" }, { Ar = "ل", En = "L" },
	{ Ar = "م", En = "Z" }, { Ar = "ن", En = "N" }, { Ar = "ه", En = "H" },
	{ Ar = "و", En = "U" }, { Ar = "ى", En = "V" },
}

local AR_DIGITS = { "٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩" }

local byLatin = {}
for _, l in PlateFormat.Letters do
	byLatin[l.En] = l
end

-- letters = نص لاتيني بترتيب القراءة العربية، مثل "ABJ" = ا ب ح
-- numbers = نص أرقام مثل "1234"
function PlateFormat.validate(letters, numbers)
	if typeof(letters) ~= "string" or typeof(numbers) ~= "string" then
		return false, "بيانات غلط"
	end
	if #letters ~= 3 then
		return false, "لازم 3 حروف"
	end
	for i = 1, 3 do
		if not byLatin[letters:sub(i, i)] then
			return false, "حرف غير مسموح"
		end
	end
	if not numbers:match("^%d+$") or #numbers < 1 or #numbers > 4 then
		return false, "الأرقام من 1 إلى 4"
	end
	if numbers:sub(1, 1) == "0" then
		return false, "الرقم ما يبدأ بصفر"
	end
	return true
end

-- مفتاح فريد للوحة (يُستخدم عشان ما تتكرر بين اللاعبين)
function PlateFormat.key(letters, numbers)
	return letters .. "-" .. numbers
end

-- الحروف بالعربي، الحرف الأول يطلع يمين (بترتيب القراءة)
function PlateFormat.arabicLetters(letters)
	local out = {}
	for i = 1, #letters do
		table.insert(out, byLatin[letters:sub(i, i)].Ar)
	end
	return table.concat(out, " ")
end

-- الحروف اللاتينية تنعكس (زي اللوحة الحقيقية)
function PlateFormat.latinLetters(letters)
	return letters:reverse():gsub(".", "%0 "):sub(1, -2)
end

function PlateFormat.arabicNumbers(numbers)
	return (numbers:gsub("%d", function(d)
		return AR_DIGITS[tonumber(d) + 1]
	end))
end

function PlateFormat.latinNumbers(numbers)
	return (numbers:gsub(".", "%0 "):sub(1, -2))
end

return PlateFormat
