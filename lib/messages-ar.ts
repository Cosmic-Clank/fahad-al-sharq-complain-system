import { getCurrentLanguage, type Language } from "./language";

/**
 * Arabic translations for warning / status messages shown in toasts, alerts,
 * confirms, inline error banners and form validation. Google Translate can't
 * reach native alert()/confirm() boxes and often misses short-lived toasts, so
 * these are translated deterministically instead.
 *
 * Keys must match the English message exactly. Messages with dynamic parts are
 * handled by PATTERNS below.
 */
const MESSAGES_AR: Record<string, string> = {
	// ── Generic ──
	"Something went wrong. Please try again.": "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
	"Something went wrong": "حدث خطأ ما",
	"An unexpected error occurred. Please try again.": "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",
	"An unknown error occurred.": "حدث خطأ غير معروف.",
	"Server error": "خطأ في الخادم",
	"Invalid input": "إدخال غير صالح",
	"Validation failed.": "فشل التحقق من البيانات.",
	"Validation error.": "خطأ في التحقق من البيانات.",
	"Invalid date.": "تاريخ غير صالح.",
	"Invalid month.": "شهر غير صالح.",
	"Minimum 1 character": "حرف واحد على الأقل",

	// ── Auth ──
	"Unauthorized. Please log in.": "غير مصرح. يرجى تسجيل الدخول.",
	"Please log in.": "يرجى تسجيل الدخول.",
	"Invalid Credentials": "بيانات الدخول غير صحيحة",
	"Sign-in successful": "تم تسجيل الدخول بنجاح",
	"Username is required": "اسم المستخدم مطلوب",
	"username is required": "اسم المستخدم مطلوب",
	"Username cannot be empty.": "لا يمكن أن يكون اسم المستخدم فارغاً.",
	"Username is already taken.": "اسم المستخدم مستخدم بالفعل.",
	"Username already registered.": "اسم المستخدم مسجل بالفعل.",
	"Password is required": "كلمة المرور مطلوبة",
	"Password cannot be empty.": "لا يمكن أن تكون كلمة المرور فارغة.",
	"Password must be at least 6 characters long.": "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.",
	"Password must be at least 8 characters long.": "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.",
	"Password must contain at least one uppercase letter.": "يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل.",
	"Password must contain at least one lowercase letter.": "يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل.",
	"Password must contain at least one number.": "يجب أن تحتوي كلمة المرور على رقم واحد على الأقل.",
	"Password must contain at least one special character.": "يجب أن تحتوي كلمة المرور على رمز خاص واحد على الأقل.",
	"Role is required": "الدور مطلوب",

	// ── Permissions ──
	"Only admins can export reports.": "يمكن للمسؤولين فقط تصدير التقارير.",
	"Not authorized to export reports.": "غير مصرح لك بتصدير التقارير.",
	"Only admins can update handovers.": "يمكن للمسؤولين فقط تحديث عمليات التسليم.",
	"Only admins can update employee details.": "يمكن للمسؤولين فقط تحديث بيانات الموظف.",
	"Only admins can update HR profiles.": "يمكن للمسؤولين فقط تحديث ملفات الموارد البشرية.",
	"Only admins can record handovers.": "يمكن للمسؤولين فقط تسجيل عمليات التسليم.",
	"Only admins can record attendance.": "يمكن للمسؤولين فقط تسجيل الحضور.",
	"Only admins can manage tickets.": "يمكن للمسؤولين فقط إدارة التذاكر.",
	"Only admins can manage documents.": "يمكن للمسؤولين فقط إدارة المستندات.",
	"Only admins can edit responses.": "يمكن للمسؤولين فقط تعديل الردود.",
	"Only admins can edit attendance.": "يمكن للمسؤولين فقط تعديل الحضور.",
	"Only admins can delete tickets.": "يمكن للمسؤولين فقط حذف التذاكر.",
	"Only admins can delete responses.": "يمكن للمسؤولين فقط حذف الردود.",
	"Only admins can delete penalties.": "يمكن للمسؤولين فقط حذف الجزاءات.",
	"Only admins can delete inventory items.": "يمكن للمسؤولين فقط حذف أصناف المخزون.",
	"Only admins can delete employees.": "يمكن للمسؤولين فقط حذف الموظفين.",
	"Only admins can delete documents.": "يمكن للمسؤولين فقط حذف المستندات.",
	"Only admins can delete complaints.": "يمكن للمسؤولين فقط حذف الشكاوى.",
	"Only admins can delete bonuses.": "يمكن للمسؤولين فقط حذف المكافآت.",
	"Only admins can create handovers.": "يمكن للمسؤولين فقط إنشاء عمليات التسليم.",
	"Only admins can add penalties.": "يمكن للمسؤولين فقط إضافة الجزاءات.",
	"Only admins can add bonuses.": "يمكن للمسؤولين فقط إضافة المكافآت.",

	// ── Employees ──
	"Employee not found.": "الموظف غير موجود.",
	"Full name is required": "الاسم الكامل مطلوب",
	"Full name cannot be empty.": "لا يمكن أن يكون الاسم الكامل فارغاً.",
	"Full name must be at least 2 characters long": "يجب أن يتكون الاسم الكامل من حرفين على الأقل",
	"Full name must be at least 2 characters long.": "يجب أن يتكون الاسم الكامل من حرفين على الأقل.",
	"Full name must be at most 50 characters long": "يجب ألا يزيد الاسم الكامل عن 50 حرفاً",
	"Full name must be at most 100 characters long.": "يجب ألا يزيد الاسم الكامل عن 100 حرف.",
	"Employee details updated successfully!": "تم تحديث بيانات الموظف بنجاح!",
	"Failed to update employee details.": "فشل تحديث بيانات الموظف.",
	"Failed to update employee details. Please try again.": "فشل تحديث بيانات الموظف. يرجى المحاولة مرة أخرى.",
	"Failed to create employee. Please try again.": "فشل إنشاء الموظف. يرجى المحاولة مرة أخرى.",
	"No employees found or deleted.": "لم يتم العثور على موظفين أو حذفهم.",
	"No employee IDs provided for deletion.": "لم يتم تحديد أي موظف للحذف.",
	"Failed to delete employees. An unexpected error occurred.": "فشل حذف الموظفين. حدث خطأ غير متوقع.",

	// ── Complaints ──
	"Complaint not found.": "الشكوى غير موجودة.",
	"Complaint submitted successfully!": "تم تقديم الشكوى بنجاح!",
	"Complaint deleted successfully!": "تم حذف الشكوى بنجاح!",
	"Complaint assigned successfully!": "تم إسناد الشكوى بنجاح!",
	"Could not delete complaint. Please try again.": "تعذر حذف الشكوى. يرجى المحاولة مرة أخرى.",
	"Failed to delete complaint. Please try again.": "فشل حذف الشكوى. يرجى المحاولة مرة أخرى.",
	"Failed to assign complaint. Please try again.": "فشل إسناد الشكوى. يرجى المحاولة مرة أخرى.",
	"Failed to submit complaint due to validation errors.": "فشل تقديم الشكوى بسبب أخطاء في البيانات.",
	"Failed to save complaint to the database. Please try again.": "فشل حفظ الشكوى. يرجى المحاولة مرة أخرى.",
	"A complaint for this building and apartment was already submitted in the last 24 hours. Please wait before submitting another one.":
		"تم تقديم شكوى لهذا المبنى والشقة خلال آخر 24 ساعة. يرجى الانتظار قبل تقديم شكوى أخرى.",
	"Complaint ID and response text are required.": "رقم الشكوى ونص الرد مطلوبان.",
	"Response not found.": "الرد غير موجود.",
	"Response text cannot be empty.": "لا يمكن أن يكون نص الرد فارغاً.",
	"Response added successfully!": "تمت إضافة الرد بنجاح!",
	"Response updated successfully!": "تم تحديث الرد بنجاح!",
	"Response deleted successfully!": "تم حذف الرد بنجاح!",
	"Are you sure you want to delete this response?": "هل أنت متأكد من أنك تريد حذف هذا الرد؟",
	"Could not delete response. Please try again.": "تعذر حذف الرد. يرجى المحاولة مرة أخرى.",
	"Could not update response. Please try again.": "تعذر تحديث الرد. يرجى المحاولة مرة أخرى.",
	"Failed to add response. Please try again.": "فشل إضافة الرد. يرجى المحاولة مرة أخرى.",
	"Failed to update response. Please try again.": "فشل تحديث الرد. يرجى المحاولة مرة أخرى.",
	"Failed to delete response. Please try again.": "فشل حذف الرد. يرجى المحاولة مرة أخرى.",
	"Work time added successfully!": "تمت إضافة وقت العمل بنجاح!",
	"Work time ended successfully!": "تم إنهاء وقت العمل بنجاح!",
	"No active work time found for this complaint.": "لا يوجد وقت عمل نشط لهذه الشكوى.",
	"Failed to add work time. Please try again.": "فشل إضافة وقت العمل. يرجى المحاولة مرة أخرى.",
	"Failed to end work time. Please try again.": "فشل إنهاء وقت العمل. يرجى المحاولة مرة أخرى.",
	"Could not end work. Please try again.": "تعذر إنهاء العمل. يرجى المحاولة مرة أخرى.",
	"Invalid signatures provided.": "التوقيعات المقدمة غير صالحة.",
	"Please provide valid initials (1–6 characters; letters, spaces, dots, or dashes).":
		"يرجى إدخال أحرف أولى صحيحة (من 1 إلى 6 أحرف؛ حروف أو مسافات أو نقاط أو شرطات).",
	"Failed to upload image. Please try again.": "فشل رفع الصورة. يرجى المحاولة مرة أخرى.",
	"Invalid file. Max size is 5MB, supported types are JPEG, PNG.": "ملف غير صالح. الحد الأقصى للحجم 5 ميجابايت، والأنواع المدعومة هي JPEG و PNG.",
	"Failed to generate PDF. Check server logs.": "فشل إنشاء ملف PDF. يرجى مراجعة سجلات الخادم.",
	"Failed to generate the PDF. Please try again.": "فشل إنشاء ملف PDF. يرجى المحاولة مرة أخرى.",
	"Failed to fetch buildings": "فشل جلب المباني",

	// ── Complaint evidence (photos + video) ──
	"Please attach at least one photo of the problem.": "يرجى إرفاق صورة واحدة على الأقل للمشكلة.",
	"Please attach a video of the problem.": "يرجى إرفاق فيديو للمشكلة.",
	"Some photos are invalid: max size is 5MB, supported types are JPEG and PNG.": "بعض الصور غير صالحة: الحد الأقصى للحجم 5 ميجابايت، والأنواع المدعومة هي JPEG و PNG.",
	"Invalid video: max size is 50MB, supported formats are MP4, MOV, WebM and 3GP.": "فيديو غير صالح: الحد الأقصى للحجم 50 ميجابايت، والصيغ المدعومة هي MP4 و MOV و WebM و 3GP.",
	"Failed to upload the video. Please check your connection and try again.": "فشل رفع الفيديو. يرجى التحقق من اتصالك والمحاولة مرة أخرى.",
	"The video upload could not be found. Please attach the video again.": "تعذر العثور على الفيديو المرفوع. يرجى إرفاق الفيديو مرة أخرى.",
	"Failed to submit complaint. Please try again.": "فشل تقديم الشكوى. يرجى المحاولة مرة أخرى.",

	// ── Complaint form validation ──
	"Appartment Number is required": "رقم الشقة مطلوب",
	"Phone number is required": "رقم الهاتف مطلوب",
	"Enter a valid UAE mobile (e.g., 0501234567 or +971501234567)": "أدخل رقم جوال إماراتي صحيح (مثال: 0501234567 أو ‎+971501234567)",
	"Email is required": "البريد الإلكتروني مطلوب",
	"Enter a valid email address": "أدخل بريداً إلكترونياً صحيحاً",
	"Address is required": "العنوان مطلوب",
	"Address must be at least 5 characters long": "يجب أن يتكون العنوان من 5 أحرف على الأقل",
	"Address must be at most 100 characters long": "يجب ألا يزيد العنوان عن 100 حرف",
	"Building name is required": "اسم المبنى مطلوب",
	"Apartment Number is required": "رقم الشقة مطلوب",
	"Description is required": "الوصف مطلوب",
	"Description must be at least 10 characters long": "يجب أن يتكون الوصف من 10 أحرف على الأقل",
	"Description must be at most 500 characters long": "يجب ألا يزيد الوصف عن 500 حرف",
	"Convenient time is required": "الوقت المناسب مطلوب",

	// ── Inventory ──
	"Item not found": "الصنف غير موجود",
	"Item not found.": "الصنف غير موجود.",
	"Inventory item not found.": "صنف المخزون غير موجود.",
	"Item ID is required": "رقم الصنف مطلوب",
	"Item name is required": "اسم الصنف مطلوب",
	"Item name must be at least 2 characters long": "يجب أن يتكون اسم الصنف من حرفين على الأقل",
	"Item name must be at most 100 characters long": "يجب ألا يزيد اسم الصنف عن 100 حرف",
	"Quantity is required": "الكمية مطلوبة",
	"Quantity must be at least 0": "يجب ألا تقل الكمية عن 0",
	"Quantity must be greater than zero.": "يجب أن تكون الكمية أكبر من صفر.",
	"Quantity must be a whole number for items counted in pieces": "يجب أن تكون الكمية عدداً صحيحاً للأصناف المعدودة بالقطعة",
	"Quantity must be a whole number for items counted in pieces.": "يجب أن تكون الكمية عدداً صحيحاً للأصناف المعدودة بالقطعة.",
	"Unit is required": "الوحدة مطلوبة",
	"Item code is required": "رمز الصنف مطلوب",
	"Category is required": "الفئة مطلوبة",
	"Unit price is required": "سعر الوحدة مطلوب",
	"Unit price must be greater than 0": "يجب أن يكون سعر الوحدة أكبر من 0",
	"Supplier is required": "المورّد مطلوب",
	"Location is required": "الموقع مطلوب",
	"An item photo is required.": "صورة الصنف مطلوبة.",
	"Division is required": "القسم مطلوب",
	"Please select an item.": "يرجى اختيار صنف.",
	"Please select an item": "يرجى اختيار صنف",
	"Please select a building (or Stock)": "يرجى اختيار مبنى (أو المخزون)",
	"Quantity must be greater than 0": "يجب أن تكون الكمية أكبر من 0",
	"You do not have this item in your inventory.": "هذا الصنف غير موجود في مخزونك.",
	"Items logged successfully.": "تم تسجيل الأصناف بنجاح.",
	"Inventory item created successfully!": "تم إنشاء صنف المخزون بنجاح!",
	"Inventory item updated successfully!": "تم تحديث صنف المخزون بنجاح!",
	"Inventory request created successfully!": "تم إنشاء طلب المخزون بنجاح!",
	"Only admins can create employees.": "يمكن للمسؤولين فقط إنشاء الموظفين.",
	"Only admins can manage buildings.": "يمكن للمسؤولين فقط إدارة المباني.",
	"Inventory request not found.": "طلب المخزون غير موجود.",
	"Not enough stock to approve this request.": "المخزون غير كافٍ للموافقة على هذا الطلب.",
	"Inventory request approved.": "تمت الموافقة على طلب المخزون.",
	"Inventory request rejected.": "تم رفض طلب المخزون.",
	"Failed to approve the request. Please try again.": "فشلت الموافقة على الطلب. يرجى المحاولة مرة أخرى.",
	"Failed to reject the request. Please try again.": "فشل رفض الطلب. يرجى المحاولة مرة أخرى.",
	"Only pending requests can be approved or rejected.":"لا يمكن الموافقة أو الرفض إلا على الطلبات المعلقة.",
	"Failed to create inventory item": "فشل إنشاء صنف المخزون",
	"Failed to create inventory item. Please try again.": "فشل إنشاء صنف المخزون. يرجى المحاولة مرة أخرى.",
	"Failed to update inventory item. Please try again.": "فشل تحديث صنف المخزون. يرجى المحاولة مرة أخرى.",
	"Failed to restock item": "فشل إعادة تعبئة الصنف",
	"Failed to restock item. Please try again.": "فشل إعادة تعبئة الصنف. يرجى المحاولة مرة أخرى.",
	"Failed to delete item. Please try again.": "فشل حذف الصنف. يرجى المحاولة مرة أخرى.",
	"Failed to create inventory request": "فشل إنشاء طلب المخزون",
	"Failed to create inventory request. Please try again.": "فشل إنشاء طلب المخزون. يرجى المحاولة مرة أخرى.",
	"Failed to log inventory usage. Please try again.": "فشل تسجيل استخدام المخزون. يرجى المحاولة مرة أخرى.",

	// ── HR: profile, documents, tickets ──
	"HR profile saved.": "تم حفظ ملف الموارد البشرية.",
	"Failed to save HR profile. Please try again.": "فشل حفظ ملف الموارد البشرية. يرجى المحاولة مرة أخرى.",
	"Document not found.": "المستند غير موجود.",
	"Document deleted.": "تم حذف المستند.",
	"A title is required for 'Other' documents.": "العنوان مطلوب للمستندات من نوع \"أخرى\".",
	"Invalid file. Max size 5MB; JPEG, PNG or PDF.": "ملف غير صالح. الحد الأقصى 5 ميجابايت؛ JPEG أو PNG أو PDF.",
	"Failed to upload the file. Please try again.": "فشل رفع الملف. يرجى المحاولة مرة أخرى.",
	"Failed to save document. Please try again.": "فشل حفظ المستند. يرجى المحاولة مرة أخرى.",
	"Failed to delete document. Please try again.": "فشل حذف المستند. يرجى المحاولة مرة أخرى.",
	"Ticket not found.": "التذكرة غير موجودة.",
	"Ticket deleted.": "تم حذف التذكرة.",
	"Failed to save ticket. Please try again.": "فشل حفظ التذكرة. يرجى المحاولة مرة أخرى.",
	"Failed to delete ticket.": "فشل حذف التذكرة.",

	// ── HR: penalties & bonuses (warnings) ──
	"Penalty recorded.": "تم تسجيل الجزاء.",
	"Penalty not found.": "الجزاء غير موجود.",
	"Penalty deleted.": "تم حذف الجزاء.",
	"Failed to record penalty. Please try again.": "فشل تسجيل الجزاء. يرجى المحاولة مرة أخرى.",
	"Failed to delete penalty.": "فشل حذف الجزاء.",
	"This deduction is automatic — change the attendance early-leave reason instead of deleting it.":
		"هذا الخصم تلقائي — قم بتغيير سبب المغادرة المبكرة في سجل الحضور بدلاً من حذفه.",
	"A positive amount is required for salary and leave-salary deductions.": "يجب إدخال مبلغ موجب لخصومات الراتب وراتب الإجازة.",
	"Invalid letter file. Max size 5MB; JPEG, PNG or PDF.": "ملف الخطاب غير صالح. الحد الأقصى 5 ميجابايت؛ JPEG أو PNG أو PDF.",
	"Failed to upload the letter file. Please try again.": "فشل رفع ملف الخطاب. يرجى المحاولة مرة أخرى.",
	"Bonus added — it will appear on that month's payslip.": "تمت إضافة المكافأة — ستظهر في قسيمة راتب ذلك الشهر.",
	"Bonus not found.": "المكافأة غير موجودة.",
	"Bonus deleted.": "تم حذف المكافأة.",
	"Failed to add bonus. Please try again.": "فشل إضافة المكافأة. يرجى المحاولة مرة أخرى.",
	"Failed to delete bonus.": "فشل حذف المكافأة.",

	// ── HR: attendance ──
	"No attendance entry for this day.": "لا يوجد سجل حضور لهذا اليوم.",
	"Attendance entry removed.": "تم حذف سجل الحضور.",
	"Failed to save attendance. Please try again.": "فشل حفظ الحضور. يرجى المحاولة مرة أخرى.",
	"Failed to remove attendance entry.": "فشل حذف سجل الحضور.",

	// ── HR: leave requests ──
	"Leave request sent — the admin will review it.": "تم إرسال طلب الإجازة — سيقوم المسؤول بمراجعته.",
	"Leave request cancelled.": "تم إلغاء طلب الإجازة.",
	"Cancel this leave request?": "هل تريد إلغاء طلب الإجازة هذا؟",
	"Leave request not found.": "طلب الإجازة غير موجود.",
	"Only requests that are still waiting can be cancelled.": "لا يمكن إلغاء إلا الطلبات التي لا تزال قيد الانتظار.",
	"Only requests that are still waiting can be approved or rejected.": "لا يمكن الموافقة أو الرفض إلا على الطلبات التي لا تزال قيد الانتظار.",
	"Please sign in the box before sending your request.": "يرجى التوقيع في المربع قبل إرسال طلبك.",
	"You already have leave on some of these days. Check your requests below.": "لديك إجازة بالفعل في بعض هذه الأيام. راجع طلباتك أدناه.",
	"Failed to send the leave request. Please try again.": "فشل إرسال طلب الإجازة. يرجى المحاولة مرة أخرى.",
	"Only admins can approve leave.": "يمكن للمسؤولين فقط الموافقة على الإجازات.",
	"Your signature is required to approve this leave.": "توقيعك مطلوب للموافقة على هذه الإجازة.",
	"This employee already has leave on some of these days.": "لدى هذا الموظف إجازة بالفعل في بعض هذه الأيام.",
	"Leave approved.": "تمت الموافقة على الإجازة.",
	"Leave rejected.": "تم رفض الإجازة.",
	"Failed to update the leave request.": "فشل تحديث طلب الإجازة.",
	"Both signatures are required (2+ years of service or no joining date set).": "التوقيعان مطلوبان (خدمة سنتين أو أكثر أو عدم تسجيل تاريخ الالتحاق).",
	"Leave recorded and approved.": "تم تسجيل الإجازة والموافقة عليها.",
	"Failed to record the leave. Please try again.": "فشل تسجيل الإجازة. يرجى المحاولة مرة أخرى.",
	"Please choose the type of leave.": "يرجى اختيار نوع الإجازة.",
	"Please choose both a start and an end date.": "يرجى اختيار تاريخ البداية وتاريخ النهاية.",
	"The end date must be on or after the start date.": "يجب أن يكون تاريخ النهاية في يوم البداية أو بعده.",
	"Leave cannot start in the past. For past sick days choose Sick Leave.": "لا يمكن أن تبدأ الإجازة في الماضي. لأيام المرض السابقة اختر الإجازة المرضية.",
	"Choose the type of leave": "اختر نوع الإجازة",
	"Choose the dates": "اختر التواريخ",
	"Sign in the box above": "وقّع في المربع أعلاه",

	// ── HR: joint letters ──
	"Only admins can create joint letters.": "يمكن للمسؤولين فقط إنشاء الخطابات المشتركة.",
	"Please choose the type of letter.": "يرجى اختيار نوع الخطاب.",
	"Please enter a subject.": "يرجى إدخال الموضوع.",
	"Please write the letter text.": "يرجى كتابة نص الخطاب.",
	"Please choose the letter date.": "يرجى اختيار تاريخ الخطاب.",
	"Both signatures are needed to sign the letter — or leave both empty to sign later.": "التوقيعان مطلوبان لتوقيع الخطاب — أو اتركهما فارغين للتوقيع لاحقاً.",
	"Joint letter created and signed.": "تم إنشاء الخطاب المشترك وتوقيعه.",
	"Joint letter saved — sign it when the employee is present.": "تم حفظ الخطاب المشترك — وقّعه عند حضور الموظف.",
	"Failed to create the joint letter. Please try again.": "فشل إنشاء الخطاب المشترك. يرجى المحاولة مرة أخرى.",
	"Joint letter not found.": "الخطاب المشترك غير موجود.",
	"This letter is already signed.": "هذا الخطاب موقّع بالفعل.",
	"Joint letter signed.": "تم توقيع الخطاب المشترك.",
	"Signed letters cannot be deleted.": "لا يمكن حذف الخطابات الموقّعة.",
	"Joint letter deleted.": "تم حذف الخطاب المشترك.",
	"Delete this unsigned letter?": "هل تريد حذف هذا الخطاب غير الموقّع؟",
	"Replace the letter text with the template for this type?": "هل تريد استبدال نص الخطاب بالقالب الخاص بهذا النوع؟",

	// ── HR: passport handovers ──
	"Handover not found.": "عملية التسليم غير موجودة.",
	"There is already an open handover for this employee.": "توجد بالفعل عملية تسليم مفتوحة لهذا الموظف.",
	"The request must be approved before handing over.": "يجب الموافقة على الطلب قبل التسليم.",
	"The passport is not currently handed over.": "جواز السفر غير مُسلَّم حالياً.",
	"Handover created and approved — collect signatures at handover.": "تم إنشاء عملية التسليم والموافقة عليها — اجمع التوقيعات عند التسليم.",
	"Both signatures are required.": "التوقيعان مطلوبان.",
	"Request submitted — the admin will review it.": "تم إرسال الطلب — سيقوم المسؤول بمراجعته.",
	"Failed to submit request. Please try again.": "فشل إرسال الطلب. يرجى المحاولة مرة أخرى.",
	"Failed to update handover.": "فشل تحديث عملية التسليم.",
	"Failed to create handover.": "فشل إنشاء عملية التسليم.",
	"Failed to record signatures.": "فشل تسجيل التوقيعات.",
};

const ATTENDANCE_STATUS_AR: Record<string, string> = { present: "حاضر", late: "متأخر", absent: "غائب" };
const ROLE_AR: Record<string, string> = { Employee: "الموظف", "Inventory Manager": "مدير المخزون", "HR Manager": "مدير الموارد البشرية" };

const PATTERNS: [RegExp, (m: RegExpMatchArray) => string][] = [
	[/^Validation error: ([\s\S]+)$/, (m) => `خطأ في التحقق من البيانات: ${m[1].split("; ").map(translateAr).join("؛ ")}`],
	[/^Error: ([\s\S]+)$/, (m) => `خطأ: ${translateAr(m[1])}`],
	[/^You can upload a maximum of (\d+) images\.$/, (m) => `يمكنك رفع ${m[1]} صور كحد أقصى.`],
	[/^Some files are invalid: Max size is 5MB, supported types are (.+)\.$/, (m) => `بعض الملفات غير صالحة: الحد الأقصى للحجم 5 ميجابايت، والأنواع المدعومة هي ${m[1]}.`],
	[/^Invalid file detected: (.+)\. Max size is 5MB, supported types are (.+)\.$/, (m) => `تم اكتشاف ملف غير صالح: ${m[1]}. الحد الأقصى للحجم 5 ميجابايت، والأنواع المدعومة هي ${m[2]}.`],
	[/^Failed to upload image (.+) to Database\. Please try again\.$/, (m) => `فشل رفع الصورة ${m[1]}. يرجى المحاولة مرة أخرى.`],
	[/^Quantity must be between (.+) and (.+)\.$/, (m) => `يجب أن تكون الكمية بين ${m[1]} و ${m[2]}.`],
	[/^Successfully added (.+)\. New quantity: (.+)$/, (m) => `تمت إضافة ${m[1]} بنجاح. الكمية الجديدة: ${m[2]}`],
	[/^Insufficient stock\. You only have (.+) unit\(s\) available\.$/, (m) => `المخزون غير كافٍ. لديك ${m[1]} وحدة فقط.`],
	[/^Insufficient inventory\. Available: (.+), Requested: (.+)$/, (m) => `المخزون غير كافٍ. المتوفر: ${m[1]}، المطلوب: ${m[2]}`],
	[/^Attendance saved \((\w+)\)\.$/, (m) => `تم حفظ الحضور (${ATTENDANCE_STATUS_AR[m[1]] ?? m[1]}).`],
	[/^(.+) created successfully!$/, (m) => (ROLE_AR[m[1]] ? `تم إنشاء ${ROLE_AR[m[1]]} بنجاح!` : m[0])],
	[/^(\d+) employee\(s\) deleted successfully\.$/, (m) => `تم حذف ${m[1]} موظف بنجاح.`],
	[/^"(.+)" deleted\.$/, (m) => `تم حذف "${m[1]}".`],
	[/^Must be at most (\d+) characters long$/, (m) => `يجب ألا يزيد عن ${m[1]} حرفاً`],
	[/^A single leave request can be at most (\d+) days\.$/, (m) => `يمكن أن يكون طلب الإجازة الواحد ${m[1]} يوماً كحد أقصى.`],
	[/^Sick leave can only start up to (\d+) days in the past\.$/, (m) => `يمكن أن تبدأ الإجازة المرضية قبل ${m[1]} يوماً كحد أقصى.`],
];

function translateAr(message: string): string {
	const exact = MESSAGES_AR[message] ?? MESSAGES_AR[message.trim()];
	if (exact) return exact;
	for (const [pattern, build] of PATTERNS) {
		const match = message.match(pattern);
		if (match) return build(match);
	}
	return message;
}

/**
 * Returns the message in the user's selected language. Unknown messages are
 * returned unchanged. Call on the client (on the server it always returns English).
 */
export function translateMessage<T extends string | null | undefined>(message: T, language: Language = getCurrentLanguage()): T {
	if (!message || language !== "ar") return message;
	return translateAr(message) as T;
}
