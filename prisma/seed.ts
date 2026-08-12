import { PrismaClient, NaTreatment, UserRole, StaffRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const branches = [
  ["001", "ALC-HO", "Head Office", true],
  ["002", "ALC-BXU", "Butuan Branch", false],
  ["003", "ALC-SFZ", "San Francisco Branch", false],
  ["004", "ALC-BYG", "Bayugan Branch", false],
  ["005", "ALC-TDG", "Tandag Branch", false],
  ["006", "ALC-CBCR", "Cabadbaran Branch", false]
] as const;

const criteria = [
  {
    category: "Character",
    code: "1A",
    name: "Honesty and Accuracy",
    questionGuide: "Please walk me through your current financial situation: income, debts, and any past loan issues.",
    naTreatment: NaTreatment.NEVER_NA,
    autoDqIfZero: true,
    sortOrder: 1,
    scores: {
      "4": "All declared information matches documents perfectly; applicant proactively disclosed sensitive information.",
      "3": "Minor discrepancies, readily explained.",
      "2": "Noticeable gaps or omissions; follow-up questions required.",
      "1": "Material omissions found during verification; repeated prompting needed.",
      "0": "Falsified documents, forged signatures, or deliberate misrepresentation detected."
    }
  },
  {
    category: "Character",
    code: "1B",
    name: "Community / Barangay Reputation",
    questionGuide: "Can you give us your barangay clearance and tell us how long you've lived in your current community?",
    naTreatment: NaTreatment.ASSIGN_NEUTRAL_2,
    autoDqIfZero: false,
    sortOrder: 2,
    scores: {
      "4": "Well-respected; positively endorsed by barangay officials and neighbors.",
      "3": "Generally known; no complaints or adverse feedback.",
      "2": "Neutral; not well-known; no endorsement or complaints.",
      "1": "Minor negative feedback such as disputes or minor complaints.",
      "0": "Known legal issues, antisocial behavior, or active barangay conflicts."
    }
  },
  {
    category: "Character",
    code: "1C",
    name: "Credit History",
    questionGuide: "Have you borrowed from any bank, cooperative, lending institution, or informal lender before? Were all loans paid on time?",
    naTreatment: NaTreatment.ASSIGN_NEUTRAL_2,
    autoDqIfZero: true,
    sortOrder: 3,
    scores: {
      "4": "Clean credit record; no missed payments; confirmed via CIBI/credit bureau if available.",
      "3": "1-2 minor late payments in the past 3 years; fully settled.",
      "2": "Some past-due accounts but now current; restructured but compliant.",
      "1": "Multiple delinquencies; unresolved accounts; restructured more than once.",
      "0": "Active default, blacklisted, or refused to disclose."
    }
  },
  {
    category: "Character",
    code: "1D",
    name: "PDC History",
    questionGuide: "Have you ever issued a check that bounced or was dishonored? Have you had any BP 22 cases filed against you?",
    naTreatment: NaTreatment.EXCLUDE_RENORMALIZE,
    autoDqIfZero: false,
    sortOrder: 4,
    scores: {
      "4": "No history of bounced checks.",
      "3": "1-2 bounced checks, already settled.",
      "2": "2-4 bounced checks, already settled.",
      "1": "5 or more bounced checks, already settled.",
      "0": "Multiple bounced checks with pending BP 22 case."
    }
  },
  {
    category: "Character",
    code: "1E",
    name: "Willingness to Pay",
    questionGuide: "How do you plan to repay this loan? What would you do if you have difficulty making a payment?",
    naTreatment: NaTreatment.NEVER_NA,
    autoDqIfZero: false,
    sortOrder: 5,
    scores: {
      "4": "Clear, confident repayment plan; specific income source and contingency identified.",
      "3": "Cooperative; straightforward answers; aware of obligations.",
      "2": "Hesitant; vague plan but shows some awareness.",
      "1": "Evasive; could not articulate repayment plan.",
      "0": "Hostile, dismissive, or showed no commitment to repaying."
    }
  },
  {
    category: "Character",
    code: "1F",
    name: "Past Loan Repayment Behavior",
    questionGuide: "For your previous loans, did you ever miss a payment? Were any loans restructured or written off?",
    naTreatment: NaTreatment.EXCLUDE_RENORMALIZE,
    autoDqIfZero: false,
    sortOrder: 6,
    scores: {
      "4": "Paid all previous loans on time or early; no restructuring.",
      "3": "Paid on time with one minor delay; self-corrected.",
      "2": "Had restructured loan but completed it; compliant after restructuring.",
      "1": "Missed payments repeatedly; required lender follow-up.",
      "0": "Loan written off, unpaid balance, or adverse indicators."
    }
  },
  {
    category: "Capacity",
    code: "2A",
    name: "Debt-to-Income Ratio",
    questionGuide: "DTI = (Existing Monthly Obligations + Proposed Amortization) / Gross Monthly Income x 100.",
    naTreatment: NaTreatment.NEVER_NA,
    autoDqIfZero: true,
    sortOrder: 7,
    scores: {
      "4": "DTI <= 50%",
      "3": "DTI 51%-60%",
      "2": "DTI 61%-70%",
      "1": "DTI 71%-80%",
      "0": "DTI > 81%"
    }
  },
  {
    category: "Capacity",
    code: "2B",
    name: "Income Stability",
    questionGuide: "Is your income the same every month, or does it fluctuate? How long have you been receiving this income?",
    naTreatment: NaTreatment.ASSIGN_FIXED_4,
    autoDqIfZero: false,
    sortOrder: 8,
    scores: {
      "4": "Fixed monthly income such as salary or pension; consistent for 3+ years.",
      "3": "Mostly stable; minor seasonal variation; consistent for 1-3 years.",
      "2": "Irregular but predictable; sufficient on average.",
      "1": "Highly variable; difficult to predict.",
      "0": "No stable income source."
    }
  },
  {
    category: "Capacity",
    code: "2C",
    name: "Length of Employment / Business Operations",
    questionGuide: "How long have you been in your current job or running your business?",
    naTreatment: NaTreatment.ASSIGN_NEUTRAL_2,
    autoDqIfZero: false,
    sortOrder: 9,
    scores: {
      "4": "5+ years with same employer or business.",
      "3": "3-5 years.",
      "2": "1-3 years.",
      "1": "Less than 1 year, probationary, or newly established.",
      "0": "No employment or business; dependent on others."
    }
  },
  {
    category: "Capacity",
    code: "2D",
    name: "Secondary Income Sources",
    questionGuide: "Do you have any other source of income aside from your primary one?",
    naTreatment: NaTreatment.EXCLUDE_RENORMALIZE,
    autoDqIfZero: false,
    sortOrder: 10,
    scores: {
      "4": "Two or more verified secondary income sources.",
      "3": "One stable secondary source.",
      "2": "One minor or irregular secondary source.",
      "1": "Occasional income only; unverifiable.",
      "0": "Sole income earner with no secondary support."
    }
  },
  {
    category: "Capital",
    code: "3A",
    name: "Savings / Bank Balance vs Loan Amount",
    questionGuide: "Do you have a savings or bank account? What is your average monthly balance?",
    naTreatment: NaTreatment.ASSIGN_FIXED_1,
    autoDqIfZero: false,
    sortOrder: 11,
    scores: {
      "4": "Savings covers at least 6 months of proposed amortization.",
      "3": "Savings covers 3-6 months.",
      "2": "Savings covers 1-3 months.",
      "1": "Savings less than 1 month.",
      "0": "No savings account or zero balance."
    }
  },
  {
    category: "Capital",
    code: "3B",
    name: "Owned Assets",
    questionGuide: "Do you own land, vehicle, equipment, or other property?",
    naTreatment: NaTreatment.EXCLUDE_RENORMALIZE,
    autoDqIfZero: false,
    sortOrder: 12,
    scores: {
      "4": "Multiple titled properties or high-value assets; well-documented.",
      "3": "One titled property or one significant asset.",
      "2": "Untitled land or low-value assets.",
      "1": "Minimal personal assets only.",
      "0": "No owned assets."
    }
  },
  {
    category: "Capital",
    code: "3C",
    name: "Investments or Business Equity",
    questionGuide: "Do you have investments, cooperative shares, time deposits, or business ownership?",
    naTreatment: NaTreatment.EXCLUDE_RENORMALIZE,
    autoDqIfZero: false,
    sortOrder: 13,
    scores: {
      "4": "Strong documented investments or business equity.",
      "3": "One significant investment or business equity.",
      "2": "Small or informal investment/business equity.",
      "1": "Minimal equity only.",
      "0": "No investment or business equity."
    }
  },
  {
    category: "Collateral",
    code: "4A",
    name: "Type and Quality of Collateral",
    questionGuide: "What are you offering as collateral? Do you have title or ownership documents?",
    naTreatment: NaTreatment.ASSIGN_FIXED_2,
    autoDqIfZero: false,
    sortOrder: 14,
    scores: {
      "4": "Titled real property in prime or accessible location.",
      "3": "Titled property in secondary location, or registered vehicle/equipment.",
      "2": "Untitled land with tax declaration, or chattel with minor depreciation.",
      "1": "Crop/harvest pledge or intangible guarantee only.",
      "0": "No collateral offered."
    }
  },
  {
    category: "Collateral",
    code: "4B",
    name: "Loan-to-Value Ratio",
    questionGuide: "LTV = Loan Amount / Appraised Collateral Value x 100.",
    naTreatment: NaTreatment.EXCLUDE_RENORMALIZE,
    autoDqIfZero: false,
    sortOrder: 15,
    scores: {
      "4": "LTV <= 60%",
      "3": "LTV 61%-70%",
      "2": "LTV 71%-80%",
      "1": "LTV 81%-90%",
      "0": "LTV > 90% or no collateral."
    }
  },
  {
    category: "Collateral",
    code: "4C",
    name: "Encumbrances / Liens",
    questionGuide: "Is the collateral fully owned by you? Is it mortgaged elsewhere, or are there co-owners?",
    naTreatment: NaTreatment.EXCLUDE_RENORMALIZE,
    autoDqIfZero: false,
    sortOrder: 16,
    scores: {
      "4": "Clean title; no liens, mortgage, or co-ownership issues.",
      "3": "Minor co-ownership, spouse only, no mortgage.",
      "2": "Existing mortgage but with sufficient equity.",
      "1": "Multiple co-owners or complex title.",
      "0": "Title under dispute, fully mortgaged, or subject to court order."
    }
  },
  {
    category: "Collateral",
    code: "4D",
    name: "Post-Dated Check Security",
    questionGuide: "What is the value and activity of the current bank account used for PDCs?",
    naTreatment: NaTreatment.EXCLUDE_RENORMALIZE,
    autoDqIfZero: false,
    sortOrder: 17,
    scores: {
      "4": "Full set of PDCs covering entire loan term, verified account, average balance at least 3x monthly amortization.",
      "3": "Full PDC set, verified account, average balance covers 1-3x amortization.",
      "2": "Partial PDCs issued, or thin but active account balance.",
      "1": "PDCs issued from account with irregular or minimal balance history.",
      "0": "Refuses or unable to issue PDCs; no checking account; prior bounced check record."
    }
  },
  {
    category: "Collateral",
    code: "4E",
    name: "ATM / Deposit Holdout",
    questionGuide: "Do you have a savings or payroll account you are willing to place under formal holdout?",
    naTreatment: NaTreatment.ASSIGN_FIXED_1,
    autoDqIfZero: false,
    sortOrder: 18,
    scores: {
      "4": "Willing and able; strong verified account balance.",
      "3": "Willing; acceptable balance.",
      "2": "Willing; moderate balance.",
      "1": "Willing but balance is weak, informal, or unverified.",
      "0": "Refuses holdout, no bank account, or unacceptable holdout risk."
    }
  },
  {
    category: "Conditions",
    code: "5A",
    name: "Purpose of Loan",
    questionGuide: "What exactly will you use this loan for? How will it generate income or benefit you?",
    naTreatment: NaTreatment.NEVER_NA,
    autoDqIfZero: false,
    sortOrder: 19,
    scores: {
      "4": "Productive purpose with clear income link.",
      "3": "Semi-productive purpose.",
      "2": "Mixed productive and consumptive purpose.",
      "1": "Primarily consumptive.",
      "0": "Refinancing existing debts or purpose unclear/unverifiable."
    }
  },
  {
    category: "Conditions",
    code: "5B",
    name: "Industry / Sector Outlook",
    questionGuide: "What industry or sector does your livelihood depend on? How has business been in the last year?",
    naTreatment: NaTreatment.ASSIGN_FIXED_4,
    autoDqIfZero: false,
    sortOrder: 20,
    scores: {
      "4": "Stable or growing sector; consistent demand; low external risk.",
      "3": "Generally stable; minor seasonal or market fluctuation.",
      "2": "Moderately vulnerable sector.",
      "1": "Struggling industry; high vulnerability.",
      "0": "Declining or highly speculative sector."
    }
  },
  {
    category: "Conditions",
    code: "5C",
    name: "Loan Amount Reasonableness",
    questionGuide: "Why this specific loan amount? How did you arrive at this figure?",
    naTreatment: NaTreatment.NEVER_NA,
    autoDqIfZero: false,
    sortOrder: 21,
    scores: {
      "4": "Amount clearly justified with quotations, receipts, or business plan.",
      "3": "Reasonable amount with general justification.",
      "2": "Slightly over-requested but still manageable.",
      "1": "Amount appears inflated versus purpose or income.",
      "0": "Amount grossly disproportionate to income, purpose, or capacity."
    }
  }
];

const loanProducts = ["Salary Loan", "Pension Loan", "Chattel Loan", "Real Estate Loan", "Business Loan", "Bonus Loan"];
const loanTermMonths = [3, 6, 9, 12, 18, 24, 30, 36, 48, 60];
const sexOptions = ["Male", "Female"];
const civilStatusOptions = ["Single", "Married", "Separated", "Widow", "Live-in"];
const residenceTypeOptions = ["Owned", "Living with Relatives", "Company Provided", "Renting", "Mortgaged"];

async function main() {
  for (const [branchCode, branchName, branchAddress, isHeadOffice] of branches) {
    await prisma.branch.upsert({
      where: { branchCode },
      update: { branchName, branchAddress, isHeadOffice, status: "ACTIVE" },
      create: { branchCode, branchName, branchAddress, isHeadOffice }
    });
  }

  const ho = await prisma.branch.findUniqueOrThrow({ where: { branchCode: "001" } });
  const bxu = await prisma.branch.findUniqueOrThrow({ where: { branchCode: "002" } });
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const positionDefaults = [
    ["Branch AO", UserRole.ACCOUNT_OFFICER], ["Branch AA", UserRole.ACCOUNT_OFFICER], ["Branch Senior AO", UserRole.ACCOUNT_OFFICER],
    ["Branch Bookkeeper", UserRole.BOOKKEEPER], ["Branch Cashier", UserRole.CASHIER], ["Branch TL / MA", UserRole.BRANCH_TEAM_LEADER],
    ["Area TL", UserRole.AREA_TEAM_LEADER], ["Head Office TL", UserRole.HEAD_OFFICE_CREDIT_COMMITTEE], ["Remedial", UserRole.HEAD_OFFICE_CREDIT_COMMITTEE],
    ["Accounting", UserRole.HEAD_OFFICE_CREDIT_COMMITTEE], ["Head Office Cashier", UserRole.HEAD_OFFICE_CREDIT_COMMITTEE], ["CMG", UserRole.HEAD_OFFICE_CREDIT_COMMITTEE],
    ["Finance Manager", UserRole.HEAD_OFFICE_CREDIT_COMMITTEE], ["President", UserRole.HEAD_OFFICE_CREDIT_COMMITTEE]
  ] as const;
  for (const [name, systemRole] of positionDefaults) await prisma.position.upsert({ where: { name }, update: { systemRole, isActive: true }, create: { name, systemRole } });

  const users = [
    ["SA-001", "Super Admin", "superadmin@alc.local", "superadmin", UserRole.SUPER_ADMIN, ho.id],
    ["HOA-001", "Head Office Admin", "hoadmin@alc.local", "hoadmin", UserRole.HEAD_OFFICE_ADMIN, ho.id],
    ["HCC-001", "HO Credit Committee User", "hocc@alc.local", "hocc", UserRole.HEAD_OFFICE_CREDIT_COMMITTEE, ho.id],
    ["AO-BXU-001", "BXU Account Officer", "ao.bxu@alc.local", "aobxu", UserRole.ACCOUNT_OFFICER, bxu.id],
    ["BTL-BXU-001", "BXU Branch Team Leader", "btl.bxu@alc.local", "btlbxu", UserRole.BRANCH_TEAM_LEADER, bxu.id]
  ] as const;

  for (const [employeeNo, fullName, email, username, role, branchId] of users) {
    await prisma.user.upsert({
      where: { username },
      update: { employeeNo, fullName, email, role, branchId, status: "ACTIVE" },
      create: { employeeNo, fullName, email, username, role, branchId, passwordHash }
    });
  }

  const ao = await prisma.user.findUniqueOrThrow({ where: { username: "aobxu" } });
  const btl = await prisma.user.findUniqueOrThrow({ where: { username: "btlbxu" } });
  const hocc = await prisma.user.findUniqueOrThrow({ where: { username: "hocc" } });
  const superadmin = await prisma.user.findUniqueOrThrow({ where: { username: "superadmin" } });

  await prisma.branchStaffAssignment.createMany({
    data: [
      { branchId: bxu.id, userId: ao.id, staffRole: StaffRole.ACCOUNT_OFFICER },
      { branchId: bxu.id, userId: btl.id, staffRole: StaffRole.BRANCH_TEAM_LEADER }
    ],
    skipDuplicates: true
  });

  const weights = [
    ["Character", 30],
    ["Capacity", 30],
    ["Capital", 10],
    ["Collateral", 15],
    ["Conditions", 15]
  ] as const;

  for (const [category, weightPercent] of weights) {
    await prisma.scorecardSetting.upsert({
      where: { category },
      update: { weightPercent, isActive: true },
      create: { category, weightPercent }
    });
  }

  for (const criterion of criteria) {
    await prisma.scorecardCriterion.upsert({
      where: { code: criterion.code },
      update: {
        category: criterion.category,
        name: criterion.name,
        questionGuide: criterion.questionGuide,
        scoreDescriptions: criterion.scores,
        naTreatment: criterion.naTreatment,
        autoDqIfZero: criterion.autoDqIfZero,
        sortOrder: criterion.sortOrder,
        isActive: true
      },
      create: {
        category: criterion.category,
        code: criterion.code,
        name: criterion.name,
        questionGuide: criterion.questionGuide,
        scoreDescriptions: criterion.scores,
        naTreatment: criterion.naTreatment,
        autoDqIfZero: criterion.autoDqIfZero,
        sortOrder: criterion.sortOrder
      }
    });
  }

  const branchCommittee = await prisma.creditCommittee.upsert({
    where: { id: 1 },
    update: {
      committeeName: "ALC-BXU Branch Credit Committee",
      branchId: bxu.id,
      isHeadOfficeCommittee: false,
      minLoanAmount: 0,
      maxLoanAmount: 30000,
      status: "ACTIVE"
    },
    create: {
      committeeName: "ALC-BXU Branch Credit Committee",
      branchId: bxu.id,
      isHeadOfficeCommittee: false,
      minLoanAmount: 0,
      maxLoanAmount: 30000
    }
  });

  const midCommittee = await prisma.creditCommittee.upsert({
    where: { id: 2 },
    update: {
      committeeName: "Credit Committee — ₱30,000.01 to ₱90,000",
      branchId: ho.id,
      isHeadOfficeCommittee: true,
      minLoanAmount: 30000.01,
      maxLoanAmount: 90000,
      status: "ACTIVE"
    },
    create: {
      committeeName: "Credit Committee — ₱30,000.01 to ₱90,000",
      branchId: ho.id,
      isHeadOfficeCommittee: true,
      minLoanAmount: 30000.01,
      maxLoanAmount: 90000
    }
  });

  const highCommittee = await prisma.creditCommittee.upsert({
    where: { id: 3 },
    update: { committeeName: "Credit Committee — Above ₱90,000", branchId: ho.id, isHeadOfficeCommittee: true, minLoanAmount: 90000.01, maxLoanAmount: null, status: "ACTIVE" },
    create: { committeeName: "Credit Committee — Above ₱90,000", branchId: ho.id, isHeadOfficeCommittee: true, minLoanAmount: 90000.01, maxLoanAmount: null }
  });

  await prisma.creditCommitteeMember.deleteMany({ where: { creditCommitteeId: { in: [branchCommittee.id, midCommittee.id, highCommittee.id] } } });
  await prisma.creditCommitteeMember.createMany({
    data: [
      { creditCommitteeId: branchCommittee.id, userId: btl.id, committeeRole: "Branch Team Leader", approvalSequence: 1, isRequired: true },
      { creditCommitteeId: midCommittee.id, userId: btl.id, committeeRole: "Branch Team Leader", approvalSequence: 1, isRequired: true },
      { creditCommitteeId: midCommittee.id, userId: hocc.id, committeeRole: "Head Office Credit Committee", approvalSequence: 2, isRequired: true },
      { creditCommitteeId: highCommittee.id, userId: btl.id, committeeRole: "Branch Team Leader", approvalSequence: 1, isRequired: true },
      { creditCommitteeId: highCommittee.id, userId: hocc.id, committeeRole: "Head Office Credit Committee", approvalSequence: 2, isRequired: true },
      { creditCommitteeId: highCommittee.id, userId: superadmin.id, committeeRole: "Final Approver", approvalSequence: 3, isRequired: true }
    ],
    skipDuplicates: true
  });

  for (const [index, name] of loanProducts.entries()) {
    await prisma.loanProduct.upsert({
      where: { name },
      update: { sortOrder: index, isActive: true },
      create: { name, sortOrder: index }
    });
  }

  for (const [index, months] of loanTermMonths.entries()) {
    await prisma.loanTermOption.upsert({
      where: { months },
      update: { sortOrder: index, isActive: true },
      create: { months, sortOrder: index }
    });
  }

  for (const [index, label] of sexOptions.entries()) {
    await prisma.sexOption.upsert({
      where: { label },
      update: { sortOrder: index, isActive: true },
      create: { label, sortOrder: index }
    });
  }

  for (const [index, label] of civilStatusOptions.entries()) {
    await prisma.civilStatusOption.upsert({
      where: { label },
      update: { sortOrder: index, isActive: true },
      create: { label, sortOrder: index }
    });
  }

  for (const [index, label] of residenceTypeOptions.entries()) {
    await prisma.residenceTypeOption.upsert({
      where: { label },
      update: { sortOrder: index, isActive: true },
      create: { label, sortOrder: index }
    });
  }

  const locationsPath = path.join(__dirname, "data", "caraga-locations.json");
  if (fs.existsSync(locationsPath)) {
    const locations = JSON.parse(fs.readFileSync(locationsPath, "utf8")) as { region: string; province: string; cityMunicipality: string; barangay: string }[];
    const existingCount = await prisma.addressBarangay.count();
    if (existingCount === 0) {
      await prisma.addressBarangay.createMany({ data: locations, skipDuplicates: true });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
