"""Builds "Member Entry Sheet.xlsx", the data-entry workbook that mirrors the
samaj's paper directory form (डायरेक्टरी में विवरण हेतु).

scripts/import.mjs reads its ENTRY sheet by the English first line of each
heading, so a heading renamed here must be renamed in ENTRY_HEADINGS there.

Run:  python3 -m venv .venv && .venv/bin/pip install openpyxl
      .venv/bin/python scripts/build-entry-sheet.py "Member Entry Sheet.xlsx"
The output holds no member data, but it is an .xlsx, so .gitignore keeps it local.
"""
import sys
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.formatting.rule import FormulaRule
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter

OUT = sys.argv[1]
ROWS = 3000  # data rows prepared with dropdowns and checks

SAFFRON = "C32F00"
SAFFRON_PALE = "FFE4DB"
CREAM = "FDF8F1"
MIST = "FFF1EB"
GREY = "E7E3DE"
INK = "1E1A17"

thin = Side(style="thin", color="D9CFC6")
box = Border(left=thin, right=thin, top=thin, bottom=thin)

# key, English header, Hindi (as printed on the form), width, section
COLUMNS = [
    ("form", "FORM NO.", "फॉर्म नं. (गोले वाला)", 12, "m"),
    ("sr", "SR.", "क्र.", 6, "m"),
    ("name", "NAME", "परिवार के सदस्यों के नाम", 26, "m"),
    ("mobile", "MOBILE", "मोबाईल नंबर", 14, "m"),
    ("age", "AGE", "आयु", 7, "m"),
    ("married", "MARRIED?", "विवाहित / अविवाहित", 18, "m"),
    ("education", "EDUCATION", "शिक्षा", 14, "m"),
    ("relation", "RELATION TO HEAD", "मुखिया से रिश्ता", 24, "m"),
    ("blood", "BLOOD GROUP", "ब्लड ग्रुप", 9, "m"),
    ("gender", "GENDER (optional)", "लिंग — खाली छोड़ें तो रिश्ते से भरेगा", 12, "m"),
    ("father", "FATHER'S NAME", "पिता का नाम (मुखिया के)", 22, "f"),
    ("gotra", "GOTRA", "गौत्र", 16, "f"),
    ("address", "ADDRESS", "स्थानीय निवास का पता", 36, "f"),
    ("area", "AREA / COLONY", "कॉलोनी / क्षेत्र (पते में से)", 20, "f"),
    ("pincode", "PINCODE", "पिन कोड (अगर लिखा हो)", 9, "f"),
    ("native", "NATIVE VILLAGE", "राजस्थान के गांव का नाम", 16, "f"),
    ("business", "BUSINESS / OFFICE", "व्यवसाय / कार्यालय का नाम एवं पता", 30, "f"),
    ("whatsapp", "WHATSAPP FOR NOTICES", "व्हाट्सएप नं. (समाज की सूचना हेतु)", 14, "f"),
    ("phoneOffice", "PHONE (OFFICE)", "टेलिफोन (ऑ)", 14, "f"),
    ("phoneHome", "PHONE (RESIDENCE)", "टेलिफोन (नि)", 14, "f"),
    ("email", "EMAIL", "ई-मेल", 26, "f"),
    ("circulars", "CIRCULARS AT", "सरक्यूलर कहाँ — निवास / संस्थान", 16, "f"),
    ("adults", "ADULTS", "बड़े", 7, "f"),
    ("children", "CHILDREN", "छोटे", 8, "f"),
    ("total", "TOTAL", "कुल संख्या", 7, "f"),
    ("notes", "NOTES", "टिप्पणी — जो पढ़ा न जाए", 26, "f"),
]
COL = {key: get_column_letter(i + 1) for i, (key, *_r) in enumerate(COLUMNS)}
LAST = get_column_letter(len(COLUMNS))
FIRST_FAMILY = COL["father"]
LAST_MEMBER = COL["gender"]

RELATIONS = [
    "Self (स्वयं)", "Wife (पत्नी)", "Husband (पति)", "Son (पुत्र)", "Daughter (पुत्री)",
    "Daughter-in-law (पुत्रवधू)", "Son-in-law (दामाद)", "Father (पिता)", "Mother (माता)",
    "Grandson (पोता / नाती)", "Granddaughter (पोती / नातिन)", "Brother (भाई)",
    "Sister (बहन)", "Brother's wife (भाभी)", "Nephew (भतीजा)", "Niece (भतीजी)",
    "Grandfather (दादा)", "Grandmother (दादी)", "Other (अन्य)",
]
MARRIED = ["Married (विवाहित)", "Unmarried (अविवाहित)", "Widowed (विधवा / विधुर)"]
BLOOD = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]
GENDER = ["M", "F"]
CIRCULARS = ["Residence (निवास)", "Office (संस्थान)"]

wb = Workbook()

# ------------------------------------------------------------------ HOW TO FILL
how = wb.active
how.title = "HOW TO FILL"
how.sheet_view.showGridLines = False
how.column_dimensions["A"].width = 4
how.column_dimensions["B"].width = 34
how.column_dimensions["C"].width = 70

def line(row, b="", c="", bold=False, size=11, color=INK, fill=None):
    for col, val in (("B", b), ("C", c)):
        cell = how[f"{col}{row}"]
        cell.value = val
        cell.font = Font(bold=bold, size=size, color=color)
        cell.alignment = Alignment(wrap_text=True, vertical="top")
        if fill:
            cell.fill = PatternFill("solid", fgColor=fill)
    # A heading with nothing beside it gets the whole width, so it never wraps
    if bold and not c and size == 11:
        how.merge_cells(f"B{row}:C{row}")

r = 2
line(r, "Member Entry Sheet", "", bold=True, size=18, color=SAFFRON); r += 1
line(r, "Shri Jain Shwetambar Murtipujak Marwadi Samaj, Indore", "Typing the paper directory forms (डायरेक्टरी में विवरण हेतु) for the app"); r += 2

line(r, "THE FIVE RULES", "", bold=True, color=SAFFRON); r += 1
rules = [
    ("1. One row per person", "Type the form's member table (परिवार की जानकारी) row by row. A family of 5 = 5 rows."),
    ("2. FORM NO. on every row", "The circled number at the bottom of the form. Same number on every row of that family. It becomes the family's permanent number in the app — never reuse one."),
    ("3. Row 1 is the head", "SR. 1 is the head of the family (मुखिया), with RELATION TO HEAD = Self (स्वयं)."),
    ("4. Family details on row 1 only", "Father's name, gotra, address, village, business, WhatsApp, phones, email and member counts come from the TOP of the form. Type them on the head's row only. Those cells turn grey on the other rows — leave them empty."),
    ("5. Use the dropdowns", "MARRIED?, RELATION TO HEAD, BLOOD GROUP, GENDER and CIRCULARS AT have a list. Pick from it instead of typing."),
]
for b, c in rules:
    line(r, b, c, bold=False); how[f"B{r}"].font = Font(bold=True); r += 1
r += 1

line(r, "FROM THE FORM → INTO THE SHEET", "", bold=True, color=SAFFRON); r += 1
line(r, "On the form (Hindi)", "Column in the ENTRY sheet", bold=True, fill=SAFFRON_PALE); r += 1
mapping = [
    ("गोले वाला नंबर (नीचे)", "FORM NO."),
    ("सदस्य का नाम (घर का मुखिया)", "NAME on row 1 — the head"),
    ("ब्लड ग्रुप (ऊपर)", "BLOOD GROUP on row 1"),
    ("पिता का नाम", "FATHER'S NAME"),
    ("गौत्र", "GOTRA"),
    ("स्थानीय निवास का पता", "ADDRESS — and copy the colony name into AREA / COLONY"),
    ("राजस्थान के गांव का नाम", "NATIVE VILLAGE"),
    ("सदस्य संख्या — बड़े / छोटे / कुल", "ADULTS / CHILDREN / TOTAL"),
    ("व्यवसाय/कार्यालय का नाम एवं पता", "BUSINESS / OFFICE — name first, then a comma, then the address"),
    ("व्हाट्सएप नं. जिस पर समाज की सूचना चाहते हैं", "WHATSAPP FOR NOTICES"),
    ("टेलिफोन नं. (ऑ) / (नि)", "PHONE (OFFICE) / PHONE (RESIDENCE)"),
    ("टेलिफोन नं. (मो)", "MOBILE on row 1, if the table's row 1 has no mobile"),
    ("ई-मेल", "EMAIL"),
    ("समाज के सरक्यूलर कहाँ चाहते है — निवास / संस्थान", "CIRCULARS AT"),
    ("Table: नाम, मोबाईल नंबर, आयु, विवाहित/अविवाहित, शिक्षा, मुखिया से रिश्ता, ब्लड ग्रुप",
     "NAME, MOBILE, AGE, MARRIED?, EDUCATION, RELATION TO HEAD, BLOOD GROUP"),
]
for b, c in mapping:
    line(r, b, c); r += 1
r += 1

line(r, "GOOD TO KNOW", "", bold=True, color=SAFFRON); r += 1
tips = [
    ("Mobile numbers", "10 digits, no spaces, no +91. The sheet warns you if it isn't 10 digits."),
    ("Can't read something?", "Type what you can and write the problem in NOTES. The committee sees every NOTE in the app's admin panel."),
    ("Blank cells are fine", "Members fill the rest (date of birth, business details, photo) in the app themselves."),
    ("GENDER", "Optional. Left blank, the app works it out from the relation (Wife → F, Son → M)."),
    ("Blank rows", "Allowed between families — they're skipped."),
    ("Don't", "rename the sheets or the column headings, or delete columns. The app reads them by name."),
    ("EXAMPLE sheet", "Two made-up families showing a correctly filled sheet. It is never imported."),
]
for b, c in tips:
    line(r, b, c); how[f"B{r}"].font = Font(bold=True); r += 1

# ----------------------------------------------------------------------- LISTS
lists = wb.create_sheet("LISTS")
for i, (title, values) in enumerate([
    ("RELATION TO HEAD", RELATIONS), ("MARRIED?", MARRIED), ("BLOOD GROUP", BLOOD),
    ("GENDER", GENDER), ("CIRCULARS AT", CIRCULARS),
]):
    col = get_column_letter(i + 1)
    lists[f"{col}1"] = title
    lists[f"{col}1"].font = Font(bold=True)
    lists.column_dimensions[col].width = 30
    for j, v in enumerate(values):
        lists[f"{col}{j + 2}"] = v
LIST_RANGE = {
    "relation": f"LISTS!$A$2:$A${len(RELATIONS) + 1}",
    "married": f"LISTS!$B$2:$B${len(MARRIED) + 1}",
    "blood": f"LISTS!$C$2:$C${len(BLOOD) + 1}",
    "gender": f"LISTS!$D$2:$D${len(GENDER) + 1}",
    "circulars": f"LISTS!$E$2:$E${len(CIRCULARS) + 1}",
}

# ------------------------------------------------------------- ENTRY / EXAMPLE
def entry_sheet(title, rows=None):
    ws = wb.create_sheet(title, 1 if title == "ENTRY" else None)
    ws.sheet_properties.tabColor = SAFFRON if title == "ENTRY" else "999999"

    # Row 1: the two halves of the form, named so the operator knows where to look
    ws.merge_cells(f"A1:{LAST_MEMBER}1")
    ws["A1"] = "MEMBERS — fill every row   (परिवार के सदस्यों की जानकारी)"
    ws.merge_cells(f"{FIRST_FAMILY}1:{LAST}1")
    ws[f"{FIRST_FAMILY}1"] = "FAMILY — head's row (SR. 1) only, from the top of the form   (सिर्फ़ मुखिया की लाइन में)"
    for ref, fill in (("A1", SAFFRON), (f"{FIRST_FAMILY}1", "7A5C48")):
        ws[ref].font = Font(bold=True, color="FFFFFF", size=11)
        ws[ref].fill = PatternFill("solid", fgColor=fill)
        ws[ref].alignment = Alignment(vertical="center", indent=1)
    ws.row_dimensions[1].height = 24

    for i, (key, en, hi, width, section) in enumerate(COLUMNS):
        col = get_column_letter(i + 1)
        c = ws[f"{col}2"]
        c.value = f"{en}\n{hi}"
        c.font = Font(bold=True, size=10, color=INK)
        c.fill = PatternFill("solid", fgColor=SAFFRON_PALE if section == "m" else "EFE6DD")
        c.alignment = Alignment(wrap_text=True, vertical="top")
        c.border = box
        ws.column_dimensions[col].width = width
    ws.row_dimensions[2].height = 48
    ws.freeze_panes = "D3"

    end = ROWS + 2
    # Phone-like columns as plain numbers, so 9425854108 never shows as 9.43E+09
    for key in ("mobile", "whatsapp", "phoneOffice", "phoneHome", "form", "sr", "age",
                "pincode", "adults", "children", "total"):
        for rr in range(3, end + 1):
            ws[f"{COL[key]}{rr}"].number_format = "0"

    def dv(**kw):
        v = DataValidation(allow_blank=True, showErrorMessage=True, **kw)
        ws.add_data_validation(v)
        return v

    for key, rng in LIST_RANGE.items():
        v = dv(type="list", formula1=f"={rng}", errorTitle="Pick from the list",
               error="Please choose one of the options from the dropdown.")
        v.add(f"{COL[key]}3:{COL[key]}{end}")
    for key in ("mobile", "whatsapp"):
        v = dv(type="textLength", operator="equal", formula1="10", errorStyle="warning",
               errorTitle="Not 10 digits", error="A mobile number has 10 digits, without +91 or spaces. Keep it anyway?")
        v.add(f"{COL[key]}3:{COL[key]}{end}")
    v = dv(type="whole", operator="greaterThan", formula1="0", errorTitle="Form number",
           error="The form number is the circled number on the form — a whole number.")
    v.add(f"{COL['form']}3:{COL['form']}{end}")
    v = dv(type="whole", operator="between", formula1="1", formula2="40", errorTitle="Serial",
           error="1 for the head, then 2, 3, 4…")
    v.add(f"{COL['sr']}3:{COL['sr']}{end}")
    v = dv(type="decimal", operator="between", formula1="0", formula2="120", errorTitle="Age",
           error="Age in years, between 0 and 120.")
    v.add(f"{COL['age']}3:{COL['age']}{end}")

    # Family cells go grey on every row that isn't a head's — the cue not to type there
    sr = COL["sr"]
    ws.conditional_formatting.add(
        f"{FIRST_FAMILY}3:{LAST}{end}",
        FormulaRule(formula=[f'AND(${sr}3<>"",${sr}3<>1)'], fill=PatternFill("solid", bgColor=GREY)),
    )
    # A rule above each head's row, so families read as blocks
    ws.conditional_formatting.add(
        f"A3:{LAST}{end}",
        FormulaRule(formula=[f"${sr}3=1"],
                    border=Border(top=Side(style="medium", color=SAFFRON)),
                    fill=PatternFill("solid", bgColor=MIST)),
    )

    for rr, values in enumerate(rows or [], start=3):
        for key, val in values.items():
            ws[f"{COL[key]}{rr}"] = val
    return ws

entry_sheet("ENTRY")

# Two invented families — numbers and names are made up and never imported
example = [
    dict(form=901, sr=1, name="Ramesh Kumar Jain", mobile=9000000101, age=58, married="Married (विवाहित)",
         education="B.Com", relation="Self (स्वयं)", blood="B+", father="Late Shri Mohanlal Jain",
         gotra="Solanki", address="12 Example Nagar, Near Jain Mandir, Indore", area="Example Nagar",
         pincode=452001, native="Sample Gaon", business="Jain Cloth Stores, 5 Sample Bazar, Indore",
         whatsapp=9000000101, phoneOffice=7310000101, email="ramesh.example@gmail.com",
         circulars="Residence (निवास)", adults=3, children=1, total=4),
    dict(form=901, sr=2, name="Sunita Jain", mobile=9000000102, age=54, married="Married (विवाहित)",
         education="B.A.", relation="Wife (पत्नी)"),
    dict(form=901, sr=3, name="Ankit Jain", mobile=9000000103, age=29, married="Married (विवाहित)",
         education="MBA", relation="Son (पुत्र)", blood="O+"),
    dict(form=901, sr=4, name="Riya Jain", age=6, married="Unmarried (अविवाहित)",
         education="1st class", relation="Granddaughter (पोती / नातिन)"),
    dict(form=902, sr=1, name="Kanta Devi Mehta", mobile=9000000201, age=71, married="Widowed (विधवा / विधुर)",
         relation="Self (स्वयं)", gotra="Parmar", address="7 Sample Colony, Indore", area="Sample Colony",
         native="Example Pura", circulars="Residence (निवास)", total=2,
         notes="Son's mobile number not readable on the form"),
    dict(form=902, sr=2, name="Vikas Mehta", age=45, married="Married (विवाहित)",
         education="B.E.", relation="Son (पुत्र)"),
]
ex = entry_sheet("EXAMPLE", example)
ex["A1"] = "EXAMPLE — made-up families, never imported. Copy the pattern, not the data."

wb.move_sheet("LISTS", offset=10)
wb.active = 1  # open on ENTRY
wb.save(OUT)
print("saved", OUT)
