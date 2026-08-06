"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calculator,
  Printer,
  Save,
  Send,
  User,
  UserRound,
  CircleUserRound,
  Smile,
  Cake,
  Hash,
  PersonStanding,
  Heart,
  Phone,
  PhoneCall,
  Mail,
  MailPlus,
  Wallet,
  Facebook,
  Twitter,
  Music2,
  Instagram,
  CreditCard,
  IdCard,
  ShieldCheck,
  Landmark,
  KeyRound,
  Map as MapIcon,
  MapPin,
  Building2,
  MapPinned,
  Home,
  CalendarDays,
  Building,
  Plus,
  Trash2,
  type LucideIcon
} from "lucide-react";

type Criterion = {
  category: string;
  code: string;
  name: string;
  questionGuide: string;
  scoreDescriptions: Record<string, string>;
  naTreatment: string;
  autoDqIfZero: boolean;
};

type Officer = { id: number; fullName: string; branchCode: string; branchName: string };
type CurrentUser = { id: number; fullName: string; role: string; branchCode: string; branchName: string };

type AddressLocation = { region: string; province: string; cityMunicipality: string; barangay: string };

type LoanEditorProps = {
  loan: any;
  criteria: Criterion[];
  settings: { category: string; weightPercent: string | number }[];
  currentUser: CurrentUser;
  officers: Officer[];
  loanProducts: string[];
  loanTermOptions: string[];
  sexOptions: string[];
  civilStatusOptions: string[];
  residenceTypeOptions: string[];
  addressLocations: AddressLocation[];
};

const tabs = ["Loan", "Applicant", "Family Background", "Source of Income", "Cash Flow", "Liabilities", "References", "Assets", "Collateral", "Scorecard", "Recommendation"];

/** Multipliers that convert an amount at a given frequency into its monthly equivalent. */
const FREQUENCY_TO_MONTHLY: Record<string, number> = {
  Daily: 30,
  Weekly: 4.33,
  "Bi-Weekly": 2.17,
  "Semi-Monthly": 2,
  Monthly: 1,
  Quarterly: 1 / 3,
  "Semi-Annually": 1 / 6,
  Annually: 1 / 12
};
const FREQUENCIES = Object.keys(FREQUENCY_TO_MONTHLY);

const LIABILITY_FIELDS: RowField[] = [
  { name: "creditor", label: "Creditor" },
  { name: "purpose", label: "Purpose" },
  { name: "originalAmount", label: "Original amount", kind: "money" },
  { name: "outstandingBalance", label: "Outstanding balance", kind: "money" },
  { name: "monthlyObligation", label: "Monthly obligation", kind: "money" },
  { name: "dueDate", label: "Due date", kind: "date" },
  { name: "loanStatus", label: "Loan status" }
];

const REFERENCE_FIELDS: RowField[] = [
  { name: "referenceName", label: "Reference name" },
  { name: "relationship", label: "Role/relationship" },
  { name: "contactNo", label: "Contact no." },
  { name: "keyFeedback", label: "Key feedback" }
];

const ASSET_FIELDS: RowField[] = [
  { name: "assetType", label: "Asset" },
  { name: "description", label: "Description" },
  { name: "conditionStatus", label: "Condition" },
  { name: "estimatedValue", label: "Estimated value", kind: "money" },
  { name: "ownedBy", label: "Owned by owner" }
];

const COLLATERAL_LAND_FIELDS: RowField[] = [
  { name: "registeredOwner", label: "Registered owner" },
  { name: "titleNo", label: "Title no." },
  { name: "location", label: "Location" },
  { name: "area", label: "Area" },
  { name: "declaredValue", label: "Declared value (BIR)", kind: "money" },
  { name: "taxDeclarationNo", label: "Tax declaration no." },
  { name: "assessedValue", label: "Assessed value", kind: "money" },
  { name: "landClassification", label: "Land classification" },
  { name: "marketValue", label: "Market value", kind: "money" },
  { name: "dateLastAppraised", label: "Date last appraised", kind: "date" },
  { name: "appraisedValue", label: "Appraised value", kind: "money" }
];

const COLLATERAL_CHATTEL_FIELDS: RowField[] = [
  { name: "registeredOwner", label: "Registered owner" },
  { name: "vehicleCrNo", label: "CR no." },
  { name: "vehicleOrNo", label: "OR no." },
  { name: "vehicleModel", label: "Model" },
  { name: "vehicleMake", label: "Make" },
  { name: "vehicleColor", label: "Color" },
  { name: "vehicleType", label: "Type" },
  { name: "chassisNo", label: "Chassis no." },
  { name: "engineNo", label: "Engine no." },
  { name: "dateAcquired", label: "Date acquired", kind: "date" },
  { name: "expiryDate", label: "Expiry date", kind: "date" },
  { name: "dateLastAppraised", label: "Date last appraised", kind: "date" },
  { name: "appraisedValue", label: "Appraised value", kind: "money" }
];

const ATTACHED_PROPERTY_FIELDS: RowField[] = [
  { name: "taxDeclarationNo", label: "Tax declaration no." },
  { name: "description", label: "Description" },
  { name: "conditionStatus", label: "Condition" },
  { name: "assessedValue", label: "Assessed value", kind: "money" },
  { name: "appraisedValue", label: "Appraised value", kind: "money" }
];

const SUPPLIER_CUSTOMER_FIELDS: RowField[] = [
  { name: "name", label: "Name" },
  { name: "serviceProduct", label: "Service/product" },
  { name: "contactInfo", label: "Contact info" }
];

const CROP_PRODUCTION_FIELDS: RowField[] = [
  { name: "item", label: "Item" },
  { name: "currentSeason", label: "Current season" },
  { name: "lastSeason", label: "Last season" },
  { name: "nextSeasonEstimate", label: "Next season estimate" }
];

const FARM_COST_FIELDS: RowField[] = [
  { name: "costItem", label: "Cost item" },
  { name: "qtyBasis", label: "QTY/basis" },
  { name: "costPerUnit", label: "Cost per unit", kind: "money" },
  { name: "totalCost", label: "Total cost", kind: "money" },
  { name: "remarks", label: "Remarks" }
];

type CashFlowRow = { entryType: string; description: string; amount: string; frequency: string };

const BLANK_CASH_FLOW: CashFlowRow = { entryType: "Income", description: "", amount: "", frequency: "Monthly" };

/** Monthly equivalent of a row's amount, or 0 when the amount is blank or not a number. */
function monthlyEquivalent(row: CashFlowRow) {
  const amount = Number(row.amount);
  if (!Number.isFinite(amount)) return 0;
  return amount * (FREQUENCY_TO_MONTHLY[row.frequency] ?? 1);
}

function peso(value: number) {
  return value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const EMPLOYMENT_STATUSES = ["Employed", "Self Employed", "Business Owner", "OFW", "Pensioner", "Farmer/Agricultural", "Other"];

const HEALTH_RISKS = ["Hypertension", "Diabetes", "Heart disease", "Kidney disease", "Cancer", "COPD/asthma", "Stroke history", "Alzheimer's/dementia"];

const PROOF_OF_RELATIONSHIP = [
  "Marriage contract",
  "Death Certificate",
  "Certificate of Legal Beneficiary/Declaration of beneficiary",
  "Latest CENOMAR",
  "Birth Certificate",
  "Survivor ID"
];

const LAND_CHARACTERISTICS = ["Flat-Land", "Rolling Land", "Forest", "Segmented"];

const FARM_RISKS = [
  "Flood-prone area",
  "Drought-prone area",
  "Pest / disease prone",
  "Weak irrigation system",
  "Low mechanization",
  "No storage capacity",
  "High fertilizer price exposure",
  "Boundary or land dispute",
  "Peace and order issue",
  "No crop insurance",
  "High household dependency ratio",
  "Heavy dependence on one buyer",
  "Frequent typhoon exposure",
  "Other risk present",
  "Active Farm",
  "Clean Surrounding",
  "Clean Neighbor",
  "Crops of neighbor",
  "Post-harvest storage",
  "Crop insurance",
  "Irrigation access",
  "Resistant seed variety",
  "Crop rotation / soil management",
  "Technical training attended",
  "Diversified plots / locations",
  "Guaranteed buyer / offtake"
];

type IncomeField = {
  name: string;
  label: string;
  kind?: "text" | "number" | "money" | "date" | "radio" | "textarea" | "checkboxes";
  options?: string[];
};

/** Heading shown for each selected source of income, and the fields that belong to it. */
const INCOME_SECTIONS: { status: string; heading: string; fields: IncomeField[] }[] = [
  {
    status: "Employed",
    heading: "For Employed Applicants",
    fields: [
      { name: "employerName", label: "Employer name" },
      { name: "positionDesignation", label: "Position/designation" },
      { name: "employmentType", label: "Employment type", kind: "radio", options: ["Regular", "Contractual", "Job Order", "Probationary"] },
      { name: "companyAddress", label: "Company address" },
      { name: "lengthOfService", label: "Length of service" },
      { name: "hrSupervisorNameContact", label: "HR/supervisor name & contact" },
      { name: "grossMonthlySalary", label: "Gross monthly salary", kind: "money" },
      { name: "netMonthlyTakeHomePay", label: "Net monthly take-home pay", kind: "money" },
      { name: "bankBranch", label: "Bank and branch" },
      { name: "accountNumber", label: "Account number" },
      { name: "notes", label: "Notes", kind: "textarea" }
    ]
  },
  {
    status: "Pensioner",
    heading: "For Pension Applicants",
    fields: [
      { name: "pensionType", label: "Type of pension", kind: "radio", options: ["SSS", "GSIS", "PVAO", "Private"] },
      { name: "pensionSssGsisNo", label: "SSS/GSIS no." },
      { name: "pensionMonthlyAmount", label: "Monthly pension amount", kind: "money" },
      { name: "pensionStartDate", label: "Date pension started", kind: "date" },
      { name: "pensionBankBranch", label: "Bank and branch" },
      { name: "pensionAccountNumber", label: "Account number" },
      { name: "pensionDeceasedMember", label: "Deceased member" },
      { name: "deceasedMemberSssGsisNo", label: "Deceased member SSS/GSIS no." },
      { name: "deceasedMemberMonthlyPension", label: "Deceased member monthly pension", kind: "money" },
      { name: "deceasedMemberPensionStart", label: "Deceased member date pension started", kind: "date" },
      { name: "deceasedMemberBankBranch", label: "Deceased member bank and branch" },
      { name: "deceasedMemberAccountNumber", label: "Deceased member account number" },
      { name: "pensionRelationshipTo", label: "Relationship to", kind: "radio", options: ["Spouse", "Child", "Parent", "Designated beneficiary"] },
      { name: "pensionProofOfRelationship", label: "Proof of relationship", kind: "checkboxes", options: PROOF_OF_RELATIONSHIP },
      { name: "pensionSurvivorId", label: "Survivor ID" },
      { name: "pensionTotalYearsWeService", label: "Total years of WE service", kind: "number" },
      { name: "pensionLiveInPartner", label: "Client has live-in partner", kind: "radio", options: ["Yes", "No"] },
      { name: "pensionHealthRiskAssessment", label: "Health risk assessment", kind: "checkboxes", options: HEALTH_RISKS },
      { name: "pensionNotes", label: "Notes", kind: "textarea" }
    ]
  },
  {
    status: "OFW",
    heading: "For OFW Applicants",
    fields: [
      { name: "ofwStatus", label: "OFW status", kind: "radio", options: ["Current", "Returning"] },
      { name: "countryOfDeployment", label: "Country of deployment" },
      { name: "ofwCompanyName", label: "Name of the company" },
      { name: "natureOfWork", label: "Nature of work", kind: "radio", options: ["Land", "Sea"] },
      { name: "hiringType", label: "Hiring", kind: "radio", options: ["Direct", "Agency"] },
      { name: "jobTitle", label: "Job title" },
      { name: "industry", label: "Industry" },
      { name: "contractStartDate", label: "Contract start date", kind: "date" },
      { name: "contractEndDate", label: "Contract end date", kind: "date" },
      { name: "monthlySalaryForeign", label: "Monthly salary foreign", kind: "money" },
      { name: "monthlySalaryPhp", label: "Monthly salary in PHP", kind: "money" },
      { name: "remittanceFrequency", label: "Remittance frequency", kind: "radio", options: ["Bi-Weekly", "Monthly", "Per Contract"] },
      { name: "ofwRecruitmentAgency", label: "Recruitment agency" },
      { name: "ofwAgencyAddress", label: "Agency address" },
      { name: "ofwDmwiLicense", label: "DMW license" },
      { name: "ofwTotalYears", label: "Total years as OFW", kind: "number" },
      { name: "owwaMembership", label: "OWWA membership", kind: "radio", options: ["Active", "Expired"] },
      { name: "owwaNo", label: "OWWA no." },
      { name: "ofwSssStatus", label: "SSS status", kind: "radio", options: ["Active", "Voluntary"] },
      { name: "ofwPagibigStatus", label: "Pag-ibig status", kind: "radio", options: ["Active", "Voluntary"] },
      { name: "ofwPhilhealthStatus", label: "Phil-Health", kind: "radio", options: ["Active", "Voluntary"] },
      { name: "ofwName", label: "Name of OFW" },
      { name: "ofwAuthorizedRepresentative", label: "Name of authorized representative" },
      { name: "ofwRepRelationship", label: "Relationship to OFW" },
      { name: "ofwRepCompleteAddress", label: "Complete address" },
      { name: "ofwEmail", label: "Email address" },
      { name: "ofwAlternateEmail", label: "Alternate email" },
      { name: "ofwGcashNumber", label: "GCash number" },
      { name: "ofwFacebook", label: "Facebook" },
      { name: "ofwBankBranch", label: "Bank and branch" },
      { name: "ofwAccountNumber", label: "Account number" }
    ]
  },
  {
    status: "Self Employed",
    heading: "For Self-employed / Business Owners",
    fields: [
      { name: "businessName", label: "Business name" },
      { name: "businessAddress", label: "Business address" },
      { name: "businessRegistrationNo", label: "DTI/SEC/CDA registration no." },
      { name: "natureOfBusiness", label: "Nature of business" },
      { name: "yearsOfOperations", label: "Years of operations", kind: "number" },
      { name: "averageMonthlyGrossRevenue", label: "Avg monthly gross revenue", kind: "money" },
      { name: "averageMonthlyNetIncome", label: "Avg monthly net income", kind: "money" },
      { name: "businessBankBranch", label: "Bank and branch" },
      { name: "businessAccountNumber", label: "Account number" },
      { name: "businessDepositorSince", label: "Depositor since (estimated)" },
      { name: "businessAccountType", label: "Account type" }
    ]
  },
  {
    status: "Farmer/Agricultural",
    heading: "For Farmers and Agricultural Sector",
    fields: [
      { name: "farmingType", label: "Type of farming", kind: "radio", options: ["Agriculture", "Aquaculture", "Livestock"] },
      { name: "mainProduct", label: "Main product" },
      { name: "farmerType", label: "Farmer type", kind: "radio", options: ["Owner", "Tenant", "Lessee"] },
      { name: "coopAssociation", label: "Coop association" },
      { name: "farmLocation", label: "Farm location" },
      { name: "distanceFromResidence", label: "Distance from residence" },
      { name: "rsbsaRegistered", label: "RSBSA registered" },
      { name: "yearsOfExperience", label: "Years of experience", kind: "number" },
      { name: "areaCultivated", label: "Area cultivated (ha)" },
      { name: "leaseDuration", label: "Lease duration" },
      { name: "plantingArrangement", label: "Planting arrangement", kind: "textarea" },
      { name: "sharingArrangement", label: "Sharing arrangement", kind: "textarea" },
      { name: "rentAmount", label: "Rent amount", kind: "money" },
      { name: "waterReliability", label: "Water reliability", kind: "radio", options: ["Good", "Moderate", "Weak"] },
      { name: "accessibility", label: "Accessibility", kind: "radio", options: ["Easy", "Moderate", "Difficult"] },
      { name: "landOwner", label: "Land owner" },
      { name: "landOwnerAddress", label: "Land owner address" },
      { name: "landTitleNo", label: "Title no." },
      { name: "landTaxDeclaration", label: "Tax declaration" },
      { name: "landTypeOfTitle", label: "Type of title" },
      { name: "landTinNo", label: "TIN no." },
      { name: "landCharacteristics", label: "Land characteristics", kind: "checkboxes", options: LAND_CHARACTERISTICS },
      { name: "farmRiskAssessment", label: "Farm risk assessment", kind: "checkboxes", options: FARM_RISKS },
      { name: "buyerName", label: "Buyer name" },
      { name: "buyerAddress", label: "Buyer address" },
      { name: "buyerContactInfo", label: "Buyer contact info" }
    ]
  }
];

/** Statuses that share another status's section instead of having their own. */
const STATUS_ALIASES: Record<string, string> = { "Business Owner": "Self Employed" };

const INCOME_FIELD_LIST = INCOME_SECTIONS.flatMap((section) => section.fields);
/** Multi-select groups post back as repeated form entries and are stored comma-joined. */
const INCOME_CHECKBOX_FIELDS = new Set(INCOME_FIELD_LIST.filter((field) => field.kind === "checkboxes").map((field) => field.name));
const INCOME_FIELDS = INCOME_FIELD_LIST.map((field) => field.name);
const INCOME_DATE_FIELDS = new Set(INCOME_FIELD_LIST.filter((field) => field.kind === "date").map((field) => field.name));

/** Free-text/numeric family background inputs. Parent dates, ages and the primary-earner flag are handled separately. */
const HOUSEHOLD_FIELDS = [
  "spousePartnerName",
  "spouseNickname",
  "spouseCurrentAddress",
  "spouseYearsAtAddress",
  "spouseOccupationEmployer",
  "spouseEmployerAddress",
  "spouseMonthlyIncome",
  "numberOfDependents",
  "dependentsUnder18",
  "fatherName",
  "fatherOccupation",
  "motherName",
  "motherOccupation",
  "parentAddress"
];

function blankRows<T>(rows: T[] | undefined, fallback: T): T[] {
  return rows?.length ? rows : [fallback];
}

function withCurrentValue(list: string[], current?: string | null) {
  if (!current || list.includes(current)) return list;
  return [current, ...list];
}

function configuredValue(list: string[], current?: string | null) {
  if (!current) return "";
  return list.find((option) => option.toLocaleLowerCase() === current.toLocaleLowerCase()) ?? current;
}

function calculateAge(dob: string, until?: string) {
  if (!dob) return "";
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "";
  const end = until ? new Date(until) : new Date();
  if (Number.isNaN(end.getTime())) return "";
  let age = end.getFullYear() - birth.getFullYear();
  const monthDiff = end.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) age--;
  return age >= 0 ? String(age) : "";
}

const PH_MOBILE_PATTERN = /^09\d{9}$/;

function useAddressCascade(locations: AddressLocation[], initial: { region?: string | null; province?: string | null; city?: string | null; barangay?: string | null }) {
  const [region, setRegionRaw] = useState(initial.region ?? "");
  const [province, setProvinceRaw] = useState(initial.province ?? "");
  const [city, setCityRaw] = useState(initial.city ?? "");
  const [barangay, setBarangay] = useState(initial.barangay ?? "");

  const regionOptions = useMemo(() => withCurrentValue(Array.from(new Set(locations.map((l) => l.region))).sort(), region), [locations, region]);
  const provinceOptions = useMemo(
    () => withCurrentValue(Array.from(new Set(locations.filter((l) => l.region === region).map((l) => l.province))).sort(), province),
    [locations, region, province]
  );
  const cityOptions = useMemo(
    () => withCurrentValue(Array.from(new Set(locations.filter((l) => l.region === region && l.province === province).map((l) => l.cityMunicipality))).sort(), city),
    [locations, region, province, city]
  );
  const barangayOptions = useMemo(
    () => withCurrentValue(locations.filter((l) => l.region === region && l.province === province && l.cityMunicipality === city).map((l) => l.barangay).sort(), barangay),
    [locations, region, province, city, barangay]
  );

  function setRegion(value: string) {
    setRegionRaw(value);
    setProvinceRaw("");
    setCityRaw("");
    setBarangay("");
  }
  function setProvince(value: string) {
    setProvinceRaw(value);
    setCityRaw("");
    setBarangay("");
  }
  function setCity(value: string) {
    setCityRaw(value);
    setBarangay("");
  }

  return { region, province, city, barangay, setRegion, setProvince, setCity, setBarangay, regionOptions, provinceOptions, cityOptions, barangayOptions };
}

export function LoanEditor({ loan, criteria, settings, currentUser, officers, loanProducts, loanTermOptions, sexOptions, civilStatusOptions, residenceTypeOptions, addressLocations }: LoanEditorProps) {
  const router = useRouter();
  const [tab, setTab] = useState("Loan");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const isAccountOfficer = currentUser.role === "ACCOUNT_OFFICER";
  const officersWithCurrent = useMemo(() => {
    if (!loan.loanOfficerId || officers.some((o) => o.id === loan.loanOfficerId)) return officers;
    return [...officers, { id: loan.loanOfficerId, fullName: `${loan.loanOfficer?.fullName ?? "Current officer"} (not in list)`, branchCode: loan.branch?.branchCode ?? "", branchName: loan.branch?.branchName ?? "" }];
  }, [officers, loan]);
  const [selectedOfficerId, setSelectedOfficerId] = useState(() => String(loan.loanOfficerId ?? officersWithCurrent[0]?.id ?? ""));
  const selectedOfficerBranch = useMemo(() => {
    const officer = officersWithCurrent.find((o) => String(o.id) === selectedOfficerId);
    return officer ? `${officer.branchCode} / ${officer.branchName}` : `${loan.branch?.branchCode ?? "-"} / ${loan.branch?.branchName ?? "-"}`;
  }, [officersWithCurrent, selectedOfficerId, loan]);
  const selectedLoanProduct = useMemo(() => configuredValue(loanProducts, loan.loanProduct), [loanProducts, loan.loanProduct]);
  const productOptions = useMemo(() => withCurrentValue(loanProducts, selectedLoanProduct), [loanProducts, selectedLoanProduct]);
  const termOptions = useMemo(() => withCurrentValue(loanTermOptions, loan.desiredTerms), [loanTermOptions, loan.desiredTerms]);
  const sexOptionsWithCurrent = useMemo(() => withCurrentValue(sexOptions, loan.applicantProfile?.sex), [sexOptions, loan]);
  const civilStatusOptionsWithCurrent = useMemo(() => withCurrentValue(civilStatusOptions, loan.applicantProfile?.civilStatus), [civilStatusOptions, loan]);

  const nameParts = loan.applicantProfile?.lastName || loan.applicantProfile?.firstName
    ? {
        lastName: loan.applicantProfile?.lastName ?? "",
        firstName: loan.applicantProfile?.firstName ?? "",
        middleName: loan.applicantProfile?.middleName ?? ""
      }
    : { lastName: "", firstName: loan.applicantProfile?.fullName ?? "", middleName: "" };

  const [dateOfBirth, setDateOfBirth] = useState(() => (loan.applicantProfile?.dateOfBirth ? String(loan.applicantProfile.dateOfBirth).slice(0, 10) : ""));
  const computedAge = useMemo(() => calculateAge(dateOfBirth) || String(loan.applicantProfile?.age ?? ""), [dateOfBirth, loan]);

  const [incomeSources, setIncomeSources] = useState<string[]>(() => {
    const saved = String(loan.incomeProfile?.employmentStatus ?? "")
      .split(",")
      .map((value: string) => value.trim())
      .filter(Boolean);
    return EMPLOYMENT_STATUSES.filter((status) => saved.includes(status));
  });
  const toggleIncomeSource = (status: string) =>
    setIncomeSources((current) => (current.includes(status) ? current.filter((value) => value !== status) : [...current, status]));
  /** A section shows when its own status is ticked, or when a status that shares it is. */
  const showsIncomeSection = (sectionStatus: string) =>
    incomeSources.some((status) => (STATUS_ALIASES[status] ?? status) === sectionStatus);

  const suppliers = (loan.businessContacts ?? []).filter((row: any) => row.kind === "SUPPLIER");
  const customers = (loan.businessContacts ?? []).filter((row: any) => row.kind === "CUSTOMER");

  const [liabilityRows, setLiabilityRows] = useState(() => toRowState(loan.liabilities, LIABILITY_FIELDS));
  const [referenceRows, setReferenceRows] = useState(() => toRowState(loan.references, REFERENCE_FIELDS));
  const [assetRows, setAssetRows] = useState(() => toRowState(loan.assets, ASSET_FIELDS));
  const [landRows, setLandRows] = useState(() =>
    toRowState((loan.collateral ?? []).filter((row: any) => row.collateralType !== "Chattel"), COLLATERAL_LAND_FIELDS)
  );
  const [chattelRows, setChattelRows] = useState(() =>
    toRowState((loan.collateral ?? []).filter((row: any) => row.collateralType === "Chattel"), COLLATERAL_CHATTEL_FIELDS)
  );
  const [attachedPropertyRows, setAttachedPropertyRows] = useState(() => toRowState(loan.attachedProperties, ATTACHED_PROPERTY_FIELDS));
  const [supplierRows, setSupplierRows] = useState(() => toRowState(suppliers, SUPPLIER_CUSTOMER_FIELDS));
  const [customerRows, setCustomerRows] = useState(() => toRowState(customers, SUPPLIER_CUSTOMER_FIELDS));
  const [cropRows, setCropRows] = useState(() => toRowState(loan.cropProductions, CROP_PRODUCTION_FIELDS));
  const [farmCostRows, setFarmCostRows] = useState(() => toRowState(loan.farmCostItems, FARM_COST_FIELDS));

  const [cashFlows, setCashFlows] = useState<CashFlowRow[]>(() =>
    (loan.cashFlows ?? []).length
      ? (loan.cashFlows as any[]).map((row) => ({
          entryType: row.entryType ?? "Income",
          description: row.description ?? "",
          amount: row.amount == null ? "" : padMoney(sanitizeMoney(String(row.amount))),
          frequency: row.frequency ?? "Monthly"
        }))
      : [{ ...BLANK_CASH_FLOW }]
  );
  const updateCashFlow = (index: number, patch: Partial<CashFlowRow>) =>
    setCashFlows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const removeCashFlow = (index: number) => setCashFlows((rows) => (rows.length === 1 ? [{ ...BLANK_CASH_FLOW }] : rows.filter((_, i) => i !== index)));
  const totalIncome = cashFlows.filter((row) => row.entryType === "Income").reduce((sum, row) => sum + monthlyEquivalent(row), 0);
  const totalExpense = cashFlows.filter((row) => row.entryType === "Expense").reduce((sum, row) => sum + monthlyEquivalent(row), 0);

  const toDateInput = (value: any) => (value ? String(value).slice(0, 10) : "");
  const [fatherDob, setFatherDob] = useState(() => toDateInput(loan.householdBackground?.fatherDob));
  const [fatherDod, setFatherDod] = useState(() => toDateInput(loan.householdBackground?.fatherDod));
  const [motherDob, setMotherDob] = useState(() => toDateInput(loan.householdBackground?.motherDob));
  const [motherDod, setMotherDod] = useState(() => toDateInput(loan.householdBackground?.motherDod));
  const fatherAge = useMemo(() => calculateAge(fatherDob, fatherDod), [fatherDob, fatherDod]);
  const motherAge = useMemo(() => calculateAge(motherDob, motherDod), [motherDob, motherDod]);

  const [contactNumber, setContactNumber] = useState(() => loan.applicantProfile?.contactNumber ?? "");
  const contactNumberValid = contactNumber === "" || PH_MOBILE_PATTERN.test(contactNumber);
  const [alternateContact, setAlternateContact] = useState(() => loan.applicantProfile?.alternateContact ?? "");
  const alternateContactValid = alternateContact === "" || PH_MOBILE_PATTERN.test(alternateContact);

  const currentAddr = useAddressCascade(addressLocations, {
    region: loan.applicantProfile?.addressRegion,
    province: loan.applicantProfile?.addressProvince,
    city: loan.applicantProfile?.addressCityMunicipality,
    barangay: loan.applicantProfile?.addressBarangay
  });
  const [currentStreet, setCurrentStreet] = useState(() => loan.applicantProfile?.addressStreet ?? "");

  const [sameAsCurrent, setSameAsCurrent] = useState(() => Boolean(loan.applicantProfile?.permanentSameAsCurrent));
  const permanentAddr = useAddressCascade(addressLocations, {
    region: loan.applicantProfile?.permanentAddressRegion,
    province: loan.applicantProfile?.permanentAddressProvince,
    city: loan.applicantProfile?.permanentAddressCityMunicipality,
    barangay: loan.applicantProfile?.permanentAddressBarangay
  });
  const [permanentStreet, setPermanentStreet] = useState(() => loan.applicantProfile?.permanentAddressStreet ?? "");

  const residenceTypeOptionsWithCurrent = useMemo(() => withCurrentValue(residenceTypeOptions, loan.applicantProfile?.residenceType), [residenceTypeOptions, loan]);

  const existingItems = new Map<string, any>((loan.scorecard?.items ?? []).map((item: any) => [item.subCriterionCode, item]));
  const [scoreItems, setScoreItems] = useState(() =>
    criteria.map((criterion) => ({
      code: criterion.code,
      score: existingItems.get(criterion.code)?.score ?? 2,
      isNa: existingItems.get(criterion.code)?.isNa ?? false,
      remarks: existingItems.get(criterion.code)?.remarks ?? ""
    }))
  );
  const weightByCategory = new Map(settings.map((item) => [item.category, Number(item.weightPercent)]));

  const preview = useMemo(() => {
    const itemByCode = new Map(scoreItems.map((item) => [item.code, item]));
    const rows = criteria.map((criterion) => {
      const item = itemByCode.get(criterion.code)!;
      let score = Number(item.score);
      let included = true;
      if (item.isNa && criterion.naTreatment !== "NEVER_NA") {
        if (criterion.naTreatment === "EXCLUDE_RENORMALIZE") {
          included = false;
          score = 0;
        } else if (criterion.naTreatment.includes("1")) score = 1;
        else if (criterion.naTreatment.includes("4")) score = 4;
        else score = 2;
      }
      return { ...criterion, score, included };
    });
    const categoryScores: Record<string, number> = {};
    for (const category of weightByCategory.keys()) {
      const included = rows.filter((row) => row.category === category && row.included);
      const actual = included.reduce((sum, row) => sum + row.score, 0);
      categoryScores[category] = included.length ? (actual / (included.length * 4)) * (weightByCategory.get(category) ?? 0) : 0;
    }
    const autoDq = rows.filter((row) => row.autoDqIfZero && row.included && row.score === 0);
    const overall = Object.values(categoryScores).reduce((sum, value) => sum + value, 0);
    const result = autoDq.length ? "AUTO_DENIED" : overall >= 80 ? "PROCEED" : overall >= 65 ? "FOR_CREDIT_COMMITTEE" : "DENIED";
    return { categoryScores, overall, result, autoDq };
  }, [criteria, scoreItems, settings]);

  async function saveForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contactNumberValid || !alternateContactValid) {
      setMessage("Enter a valid PH mobile number (11 digits starting with 09) before saving.");
      setTab("Applicant");
      return;
    }
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      loan: {
        ciFormNo: form.get("ciFormNo"),
        dateOfCi: form.get("dateOfCi"),
        loanProduct: form.get("loanProduct"),
        loanPurpose: form.get("loanPurpose"),
        amountApplied: form.get("amountApplied"),
        desiredTerms: form.get("desiredTerms"),
        proposedAmortization: form.get("proposedAmortization"),
        loanOfficerId: isAccountOfficer ? undefined : form.get("loanOfficerId")
      },
      applicant: {
        ...Object.fromEntries(
          [
            "lastName",
            "firstName",
            "middleName",
            "nickname",
            "dateOfBirth",
            "age",
            "sex",
            "civilStatus",
            "addressRegion",
            "addressProvince",
            "addressCityMunicipality",
            "addressBarangay",
            "addressStreet",
            "yearsAtAddress",
            "residenceType",
            "contactNumber",
            "alternateContact",
            "email",
            "alternateEmail",
            "gcashNumber",
            "facebook",
            "twitter",
            "tiktok",
            "instagram",
            "placeOfBirth",
            "monthlyRentOrMortgage",
            "tinNo",
            "sssId",
            "gsisId",
            "philhealthNo",
            "pagibigNo",
            "driversLicense"
          ].map((key) => [key, form.get(key)])
        ),
        permanentSameAsCurrent: sameAsCurrent,
        permanentAddressRegion: sameAsCurrent ? currentAddr.region : permanentAddr.region,
        permanentAddressProvince: sameAsCurrent ? currentAddr.province : permanentAddr.province,
        permanentAddressCityMunicipality: sameAsCurrent ? currentAddr.city : permanentAddr.city,
        permanentAddressBarangay: sameAsCurrent ? currentAddr.barangay : permanentAddr.barangay,
        permanentAddressStreet: sameAsCurrent ? currentStreet : permanentStreet
      },
      household: {
        ...Object.fromEntries(HOUSEHOLD_FIELDS.map((key) => [key, form.get(key)])),
        fatherDob,
        fatherDod,
        motherDob,
        motherDod,
        isPrimaryIncomeEarner: form.get("isPrimaryIncomeEarner")
      },
      income: {
        ...Object.fromEntries(
          INCOME_FIELDS.map((key) => [key, INCOME_CHECKBOX_FIELDS.has(key) ? form.getAll(key).join(", ") : form.get(key)])
        ),
        employmentStatus: incomeSources.join(", "),
        employmentStatusOther: incomeSources.includes("Other") ? form.get("employmentStatusOther") : null
      },
      liabilities: filledRows(liabilityRows),
      references: filledRows(referenceRows),
      assets: filledRows(assetRows),
      collateral: [...filledRows(landRows, { collateralType: "Land" }), ...filledRows(chattelRows, { collateralType: "Chattel" })],
      attachedProperties: filledRows(attachedPropertyRows),
      businessContacts: [...filledRows(supplierRows, { kind: "SUPPLIER" }), ...filledRows(customerRows, { kind: "CUSTOMER" })],
      cashFlows: cashFlows
        .filter((row) => row.description.trim() || String(row.amount).trim())
        .map((row, index) => ({
          entryType: row.entryType,
          description: row.description,
          amount: row.amount,
          frequency: row.frequency,
          income: row.entryType === "Income" ? monthlyEquivalent(row) : 0,
          expense: row.entryType === "Expense" ? monthlyEquivalent(row) : 0,
          sortOrder: index
        })),
      cropProductions: filledRows(cropRows),
      farmCostItems: filledRows(farmCostRows)
    };
    const res = await fetch(`/api/loans/${loan.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    setMessage(res.ok ? "CI/BI details saved." : "Unable to save details.");
    router.refresh();
  }

  async function saveScorecard() {
    setSaving(true);
    const res = await fetch(`/api/loans/${loan.id}/scorecard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: scoreItems })
    });
    setSaving(false);
    setMessage(res.ok ? "Scorecard saved and recommendation recomputed." : "Unable to save scorecard.");
    router.refresh();
  }

  return (
    <form onSubmit={saveForm}>
      <div className="no-print mb-4 flex flex-wrap gap-1 md:gap-2">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded px-1 py-0.5 text-[10px] font-semibold leading-tight transition md:rounded-md md:px-3 md:py-2 md:text-sm lg:px-4 lg:text-base ${
              tab === item ? "bg-alc-blue text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-blue-50"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      {message ? <div className="mb-4 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">{message}</div> : null}
      <section className="panel p-4">
        <div className={tab === "Loan" ? undefined : "hidden"}>
          <Grid>
              <Field name="ciFormNo" label="CI form no." defaultValue={loan.ciFormNo} />
              <Field name="dateOfCi" label="CI date" type="date" defaultValue={loan.dateOfCi ? String(loan.dateOfCi).slice(0, 10) : ""} />
              <div className="md:max-w-64">
                <span className="label">Loan officer</span>
                {isAccountOfficer ? (
                  <div className="input mt-1 bg-slate-50 text-slate-600">
                    {loan.loanOfficerId === currentUser.id ? `${currentUser.fullName} (You)` : loan.loanOfficer?.fullName ?? "-"}
                  </div>
                ) : (
                  <select className="input mt-1" name="loanOfficerId" value={selectedOfficerId} onChange={(e) => setSelectedOfficerId(e.target.value)}>
                    {officersWithCurrent.map((officer) => (
                      <option key={officer.id} value={officer.id}>{officer.fullName}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <span className="label">Branch</span>
                <div className="input mt-1 bg-slate-50 text-slate-600">{selectedOfficerBranch}</div>
              </div>
              <Select name="loanProduct" label="Loan product" defaultValue={selectedLoanProduct} options={productOptions} />
              <div className="md:max-w-64">
                <Field name="amountApplied" label="Amount applied" money defaultValue={loan.amountApplied} />
              </div>
              <Select name="desiredTerms" label="Desired terms" defaultValue={loan.desiredTerms} options={termOptions} />
              <Field name="proposedAmortization" label="Proposed amortization" money defaultValue={loan.proposedAmortization} />
              <TextArea name="loanPurpose" label="Loan purpose" defaultValue={loan.loanPurpose} />
          </Grid>
        </div>
        <div className={tab === "Applicant" ? undefined : "hidden"}>
          <Grid>
            <Field icon={User} name="lastName" label="Last name" defaultValue={nameParts.lastName} />
            <Field icon={UserRound} name="firstName" label="First name" defaultValue={nameParts.firstName} />
            <Field icon={CircleUserRound} name="middleName" label="Middle name" defaultValue={nameParts.middleName} />
            <Field icon={Smile} name="nickname" label="Nickname" defaultValue={loan.applicantProfile?.nickname} />
            <Field icon={MapPin} name="placeOfBirth" label="Place of birth" defaultValue={loan.applicantProfile?.placeOfBirth} />
            <label>
              <LabelText icon={Cake}>Date of birth</LabelText>
              <input className="input mt-1" type="date" name="dateOfBirth" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            </label>
            <label>
              <LabelText icon={Hash}>Age</LabelText>
              <input className="input mt-1 bg-slate-50 text-slate-600" name="age" value={computedAge} readOnly />
            </label>
            <div>
              <LabelText icon={PersonStanding}>Sex</LabelText>
              <div className="mt-1 flex h-[38px] items-center gap-4 rounded-md border border-slate-300 bg-white px-3">
                {sexOptionsWithCurrent.map((option) => (
                  <label key={option} className="flex items-center gap-1.5 text-sm">
                    <input type="radio" name="sex" value={option} defaultChecked={loan.applicantProfile?.sex === option} />
                    {option}
                  </label>
                ))}
              </div>
            </div>
            <Select icon={Heart} name="civilStatus" label="Civil status" defaultValue={loan.applicantProfile?.civilStatus} options={civilStatusOptionsWithCurrent} />
            <div>
              <LabelText icon={Phone}>Contact number</LabelText>
              <input
                className={`input mt-1 ${contactNumber && !contactNumberValid ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""}`}
                name="contactNumber"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, "").slice(0, 11))}
                inputMode="numeric"
                placeholder="09XXXXXXXXX"
              />
              {contactNumber && !contactNumberValid ? <p className="mt-1 text-xs text-red-600">Enter a valid PH mobile number (11 digits starting with 09).</p> : null}
            </div>
            <div>
              <LabelText icon={PhoneCall}>Alternate contact no.</LabelText>
              <input
                className={`input mt-1 ${alternateContact && !alternateContactValid ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""}`}
                name="alternateContact"
                value={alternateContact}
                onChange={(e) => setAlternateContact(e.target.value.replace(/\D/g, "").slice(0, 11))}
                inputMode="numeric"
                placeholder="09XXXXXXXXX"
              />
              {alternateContact && !alternateContactValid ? <p className="mt-1 text-xs text-red-600">Enter a valid PH mobile number (11 digits starting with 09).</p> : null}
            </div>
            <Field icon={Mail} name="email" label="Email" defaultValue={loan.applicantProfile?.email} />
            <Field icon={MailPlus} name="alternateEmail" label="Alternate email" defaultValue={loan.applicantProfile?.alternateEmail} />
            <Field icon={Wallet} name="gcashNumber" label="Gcash number" defaultValue={loan.applicantProfile?.gcashNumber} />
            <Field icon={Facebook} name="facebook" label="Facebook" defaultValue={loan.applicantProfile?.facebook} />
            <Field icon={Twitter} name="twitter" label="Twitter" defaultValue={loan.applicantProfile?.twitter} />
            <Field icon={Music2} name="tiktok" label="TikTok" defaultValue={loan.applicantProfile?.tiktok} />
            <Field icon={Instagram} name="instagram" label="Instagram" defaultValue={loan.applicantProfile?.instagram} />
            <Field icon={CreditCard} name="tinNo" label="TIN no." defaultValue={loan.applicantProfile?.tinNo} />
            <Field icon={IdCard} name="sssId" label="SSS ID" defaultValue={loan.applicantProfile?.sssId} />
            <Field icon={IdCard} name="gsisId" label="GSIS ID" defaultValue={loan.applicantProfile?.gsisId} />
            <Field icon={ShieldCheck} name="philhealthNo" label="PhilHealth no." defaultValue={loan.applicantProfile?.philhealthNo} />
            <Field icon={Landmark} name="pagibigNo" label="Pag-Ibig no." defaultValue={loan.applicantProfile?.pagibigNo} />
            <Field icon={KeyRound} name="driversLicense" label="Drivers license" defaultValue={loan.applicantProfile?.driversLicense} />
          </Grid>

          <div className="mt-4 border-t border-slate-200 pt-4">
            <LabelText icon={MapPin}>Current address</LabelText>
            <AddressFields cascade={currentAddr} prefix="address" street={currentStreet} onStreetChange={setCurrentStreet} />
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <Field icon={CalendarDays} name="yearsAtAddress" label="Years at address" type="number" defaultValue={loan.applicantProfile?.yearsAtAddress} />
            </div>
          </div>

          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <LabelText icon={MapPin}>Permanent address</LabelText>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={sameAsCurrent} onChange={(e) => setSameAsCurrent(e.target.checked)} />
                Same as Current Address
              </label>
            </div>
            {sameAsCurrent ? (
              <div className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">Matches current address above.</div>
            ) : (
              <AddressFields cascade={permanentAddr} prefix="permanentAddress" street={permanentStreet} onStreetChange={setPermanentStreet} />
            )}
          </div>

          <div className="mt-4 border-t border-slate-200 pt-4">
            <LabelText icon={Building}>Type of residence</LabelText>
            <div className="mt-1 flex flex-wrap items-center gap-4 rounded-md border border-slate-300 bg-white px-3 py-2">
              {residenceTypeOptionsWithCurrent.map((option) => (
                <label key={option} className="flex items-center gap-1.5 text-sm">
                  <input type="radio" name="residenceType" value={option} defaultChecked={loan.applicantProfile?.residenceType === option} />
                  {option}
                </label>
              ))}
            </div>
            <div className="mt-3 md:max-w-sm">
              <Field
                name="monthlyRentOrMortgage"
                label="Monthly rent/mortgage (if renting/mortgaged)"
                type="number"
                step="0.01"
                defaultValue={loan.applicantProfile?.monthlyRentOrMortgage}
              />
            </div>
          </div>
        </div>
        <div className={tab === "Family Background" ? undefined : "hidden"}>
          <SectionTitle>Spouse / Partner</SectionTitle>
          <Grid>
            <Field name="spousePartnerName" label="Spouse/partner name" defaultValue={loan.householdBackground?.spousePartnerName} />
            <Field name="spouseNickname" label="Spouse nickname" defaultValue={loan.householdBackground?.spouseNickname} />
            <Field name="spouseCurrentAddress" label="Spouse current address" placeholder="If different from client" defaultValue={loan.householdBackground?.spouseCurrentAddress} />
            <Field name="spouseYearsAtAddress" label="Spouse years at address" type="number" step="0.01" defaultValue={loan.householdBackground?.spouseYearsAtAddress} />
            <Field name="spouseOccupationEmployer" label="Spouse occupation/employer" defaultValue={loan.householdBackground?.spouseOccupationEmployer} />
            <Field name="spouseEmployerAddress" label="Spouse employer address" defaultValue={loan.householdBackground?.spouseEmployerAddress} />
            <Field name="spouseMonthlyIncome" label="Spouse monthly income" money defaultValue={loan.householdBackground?.spouseMonthlyIncome} />
          </Grid>
          <SectionTitle>Dependents</SectionTitle>
          <Grid>
            <Field name="numberOfDependents" label="No. of dependents" type="number" defaultValue={loan.householdBackground?.numberOfDependents} />
            <Field name="dependentsUnder18" label="No. of dependents under 18" type="number" defaultValue={loan.householdBackground?.dependentsUnder18} />
          </Grid>
          <SectionTitle>Father</SectionTitle>
          <Grid>
            <Field name="fatherName" label="Father's name" defaultValue={loan.householdBackground?.fatherName} />
            <label>
              <LabelText>Father date of birth</LabelText>
              <input className="input mt-1" type="date" value={fatherDob} onChange={(e) => setFatherDob(e.target.value)} />
            </label>
            <label>
              <LabelText>Father date of death</LabelText>
              <input className="input mt-1" type="date" value={fatherDod} onChange={(e) => setFatherDod(e.target.value)} />
            </label>
            <label>
              <LabelText>Father age</LabelText>
              <input className="input mt-1 bg-slate-50 text-slate-600" value={fatherAge} placeholder="Auto computed" readOnly />
            </label>
            <Field name="fatherOccupation" label="Father occupation" defaultValue={loan.householdBackground?.fatherOccupation} />
          </Grid>
          <SectionTitle>Mother</SectionTitle>
          <Grid>
            <Field name="motherName" label="Mother's name" defaultValue={loan.householdBackground?.motherName} />
            <label>
              <LabelText>Mother date of birth</LabelText>
              <input className="input mt-1" type="date" value={motherDob} onChange={(e) => setMotherDob(e.target.value)} />
            </label>
            <label>
              <LabelText>Mother date of death</LabelText>
              <input className="input mt-1" type="date" value={motherDod} onChange={(e) => setMotherDod(e.target.value)} />
            </label>
            <label>
              <LabelText>Mother age</LabelText>
              <input className="input mt-1 bg-slate-50 text-slate-600" value={motherAge} placeholder="Auto computed" readOnly />
            </label>
            <Field name="motherOccupation" label="Mother occupation" defaultValue={loan.householdBackground?.motherOccupation} />
          </Grid>
          <SectionTitle>Other</SectionTitle>
          <Grid>
            <Field name="parentAddress" label="Address of parent" defaultValue={loan.householdBackground?.parentAddress} />
            <div>
              <LabelText>Client is primary income earner</LabelText>
              <div className="mt-1 flex flex-wrap items-center gap-4 rounded-md border border-slate-300 bg-white px-3 py-2">
                {[["Yes", "true"], ["No", "false"]].map(([label, value]) => (
                  <label key={value} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="radio"
                      name="isPrimaryIncomeEarner"
                      value={value}
                      defaultChecked={loan.householdBackground?.isPrimaryIncomeEarner === (value === "true")}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </Grid>
        </div>
        <div className={tab === "Source of Income" ? undefined : "hidden"}>
          <SectionTitle>Employment status</SectionTitle>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-slate-300 bg-white px-3 py-2">
            {EMPLOYMENT_STATUSES.map((status) => (
              <label key={status} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={incomeSources.includes(status)} onChange={() => toggleIncomeSource(status)} />
                {status}
              </label>
            ))}
          </div>
          {incomeSources.includes("Other") ? (
            <label className="mt-3 block md:max-w-md">
              <LabelText>Other (please specify)</LabelText>
              <input className="input mt-1" name="employmentStatusOther" defaultValue={loan.incomeProfile?.employmentStatusOther ?? ""} />
            </label>
          ) : null}
          {incomeSources.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Select at least one employment status to record the applicant&apos;s income details.</p>
          ) : null}
          {INCOME_SECTIONS.map((section) => (
            <div key={section.status} className={showsIncomeSection(section.status) ? undefined : "hidden"}>
              <SectionTitle>{section.heading}</SectionTitle>
              <Grid>
                {section.fields.map((field) => {
                  if (field.kind === "checkboxes") {
                    const selected = String(loan.incomeProfile?.[field.name] ?? "")
                      .split(",")
                      .map((value: string) => value.trim());
                    return (
                      <div key={field.name} className="md:col-span-3">
                        <LabelText>{field.label}</LabelText>
                        <div className="mt-1 grid gap-x-5 gap-y-2 rounded-md border border-slate-300 bg-white px-3 py-2 sm:grid-cols-2 lg:grid-cols-3">
                          {field.options?.map((option) => (
                            <label key={option} className="flex items-start gap-1.5 text-sm">
                              <input className="mt-1" type="checkbox" name={field.name} value={option} defaultChecked={selected.includes(option)} />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  if (field.kind === "radio") {
                    return (
                      <div key={field.name}>
                        <LabelText>{field.label}</LabelText>
                        <div className="mt-1 flex flex-wrap items-center gap-4 rounded-md border border-slate-300 bg-white px-3 py-2">
                          {field.options?.map((option) => (
                            <label key={option} className="flex items-center gap-1.5 text-sm">
                              <input type="radio" name={field.name} value={option} defaultChecked={loan.incomeProfile?.[field.name] === option} />
                              {option}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  if (field.kind === "textarea") {
                    return (
                      <label key={field.name} className="md:col-span-3">
                        <LabelText>{field.label}</LabelText>
                        <textarea className="input mt-1" name={field.name} rows={2} defaultValue={loan.incomeProfile?.[field.name] ?? ""} />
                      </label>
                    );
                  }
                  return (
                    <Field
                      key={field.name}
                      name={field.name}
                      label={field.label}
                      money={field.kind === "money"}
                      type={field.kind === "date" ? "date" : field.kind === "number" ? "number" : "text"}
                      step={field.kind === "number" ? "0.01" : undefined}
                      defaultValue={field.kind === "date" ? toDateInput(loan.incomeProfile?.[field.name]) : loan.incomeProfile?.[field.name]}
                    />
                  );
                })}
              </Grid>
              {section.status === "Self Employed" ? (
                <>
                  <RowTable title="Top 3 suppliers" fields={SUPPLIER_CUSTOMER_FIELDS} rows={supplierRows} setRows={setSupplierRows} />
                  <RowTable title="Top 3 customers" fields={SUPPLIER_CUSTOMER_FIELDS} rows={customerRows} setRows={setCustomerRows} />
                </>
              ) : null}
              {section.status === "Farmer/Agricultural" ? (
                <>
                  <RowTable title="Crop production profile" fields={CROP_PRODUCTION_FIELDS} rows={cropRows} setRows={setCropRows} />
                  <RowTable title="Cost breakdown" fields={FARM_COST_FIELDS} rows={farmCostRows} setRows={setFarmCostRows} />
                </>
              ) : null}
            </div>
          ))}
        </div>
        <div className={tab === "Cash Flow" ? undefined : "hidden"}>
          <SectionTitle>Financial cash flow</SectionTitle>

          {/* Laptop and desktop: one editable table row per entry. */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="table-head">
                  <th className="border-b border-slate-200 px-3 py-2">Income/Expense</th>
                  <th className="border-b border-slate-200 px-3 py-2">Description</th>
                  <th className="border-b border-slate-200 px-3 py-2">Amount</th>
                  <th className="border-b border-slate-200 px-3 py-2">Frequency</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-right">Income</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-right">Expense</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cashFlows.map((row, index) => {
                  const monthly = monthlyEquivalent(row);
                  return (
                    <tr key={index} className="align-top">
                      <td className="border-b border-slate-100 px-3 py-2">
                        <div className="flex items-center gap-3">
                          {["Income", "Expense"].map((option) => (
                            <label key={option} className="flex items-center gap-1.5">
                              <input
                                type="radio"
                                name={`cashFlowType-${index}`}
                                checked={row.entryType === option}
                                onChange={() => updateCashFlow(index, { entryType: option })}
                              />
                              {option}
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        <input className="input" value={row.description} onChange={(e) => updateCashFlow(index, { description: e.target.value })} placeholder="Description" />
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        <MoneyInput value={row.amount} onChange={(next) => updateCashFlow(index, { amount: next })} />
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        <select className="input" value={row.frequency} onChange={(e) => updateCashFlow(index, { frequency: e.target.value })}>
                          {FREQUENCIES.map((option) => <option key={option}>{option}</option>)}
                        </select>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-right tabular-nums text-slate-600">{row.entryType === "Income" ? peso(monthly) : "0.00"}</td>
                      <td className="border-b border-slate-100 px-3 py-2 text-right tabular-nums text-slate-600">{row.entryType === "Expense" ? peso(monthly) : "0.00"}</td>
                      <td className="border-b border-slate-100 px-3 py-2 text-right">
                        <button type="button" className="btn-secondary" onClick={() => removeCashFlow(index)}>
                          <Trash2 /> Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Small screens: stacked card per entry. */}
          <div className="space-y-4 md:hidden">
            {cashFlows.map((row, index) => {
              const monthly = monthlyEquivalent(row);
              return (
                <div key={index} className="rounded-md border border-slate-200 p-3">
                  <LabelText>Income/Expense</LabelText>
                  <div className="mt-1 flex items-center gap-4 rounded-md border border-slate-300 bg-white px-3 py-2">
                    {["Income", "Expense"].map((option) => (
                      <label key={option} className="flex items-center gap-1.5 text-sm">
                        <input
                          type="radio"
                          name={`cashFlowTypeMobile-${index}`}
                          checked={row.entryType === option}
                          onChange={() => updateCashFlow(index, { entryType: option })}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                  <label className="mt-3 block">
                    <LabelText>Description</LabelText>
                    <input className="input mt-1" value={row.description} onChange={(e) => updateCashFlow(index, { description: e.target.value })} placeholder="Description" />
                  </label>
                  <label className="mt-3 block">
                    <LabelText>Amount</LabelText>
                    <MoneyInput className="input mt-1" value={row.amount} onChange={(next) => updateCashFlow(index, { amount: next })} />
                  </label>
                  <label className="mt-3 block">
                    <LabelText>Frequency</LabelText>
                    <select className="input mt-1" value={row.frequency} onChange={(e) => updateCashFlow(index, { frequency: e.target.value })}>
                      {FREQUENCIES.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </label>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <LabelText>Income</LabelText>
                      <div className="input mt-1 bg-slate-50 tabular-nums text-slate-600">{row.entryType === "Income" ? peso(monthly) : "0.00"}</div>
                    </div>
                    <div>
                      <LabelText>Expense</LabelText>
                      <div className="input mt-1 bg-slate-50 tabular-nums text-slate-600">{row.entryType === "Expense" ? peso(monthly) : "0.00"}</div>
                    </div>
                  </div>
                  <button type="button" className="btn-secondary mt-3 w-full" onClick={() => removeCashFlow(index)}>
                    <Trash2 /> Remove row
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="btn-primary" onClick={() => setCashFlows((rows) => [...rows, { ...BLANK_CASH_FLOW }])}>
              <Plus /> Add row
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:max-w-lg">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="label">Total income</div>
              <div className="text-lg font-semibold tabular-nums text-alc-blue">{peso(totalIncome)}</div>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="label">Total expense</div>
              <div className="text-lg font-semibold tabular-nums text-red-700">{peso(totalExpense)}</div>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">Income and expense columns show the monthly equivalent of each amount, based on the selected frequency.</p>
        </div>
        <div className={tab === "Liabilities" ? undefined : "hidden"}>
          <RowTable title="Existing loans and liabilities" fields={LIABILITY_FIELDS} rows={liabilityRows} setRows={setLiabilityRows} />
        </div>
        <div className={tab === "References" ? undefined : "hidden"}>
          <RowTable title="Character and repayment behavior" fields={REFERENCE_FIELDS} rows={referenceRows} setRows={setReferenceRows} />
        </div>
        <div className={tab === "Assets" ? undefined : "hidden"}>
          <RowTable title="Assets capital and collateral" fields={ASSET_FIELDS} rows={assetRows} setRows={setAssetRows} />
        </div>
        <div className={tab === "Collateral" ? undefined : "hidden"}>
          <RowTable title="Collateral (land)" fields={COLLATERAL_LAND_FIELDS} rows={landRows} setRows={setLandRows} />
          <RowTable title="Attached properties to land" fields={ATTACHED_PROPERTY_FIELDS} rows={attachedPropertyRows} setRows={setAttachedPropertyRows} />
          <RowTable title="Chattel" fields={COLLATERAL_CHATTEL_FIELDS} rows={chattelRows} setRows={setChattelRows} />
        </div>
        <div className={tab === "Scorecard" ? undefined : "hidden"}>
          <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              {["Character", "Capacity", "Capital", "Collateral", "Conditions"].map((category) => (
                <div key={category} className="rounded-md border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 font-semibold">{category}</div>
                  <div className="divide-y divide-slate-100">
                    {criteria.filter((c) => c.category === category).map((criterion) => {
                      const index = scoreItems.findIndex((item) => item.code === criterion.code);
                      const item = scoreItems[index];
                      return (
                        <div key={criterion.code} className="p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="font-semibold">{criterion.code}. {criterion.name}</div>
                              <p className="mt-1 text-sm text-slate-600">{criterion.questionGuide}</p>
                              {criterion.autoDqIfZero ? <div className="mt-2 text-xs font-semibold text-red-700">Auto-DQ when scored 0</div> : null}
                            </div>
                            <select className="input w-28" value={item.score} onChange={(e) => replaceScore(index, { score: Number(e.target.value) })}>
                              {[4, 3, 2, 1, 0].map((score) => <option key={score} value={score}>{score}</option>)}
                            </select>
                          </div>
                          <div className="mt-2 text-xs text-slate-500">{criterion.scoreDescriptions[String(item.score)]}</div>
                          <div className="mt-3 grid gap-2 md:grid-cols-[180px_1fr]">
                            <label className="flex items-center gap-2 text-sm">
                              <input type="checkbox" checked={item.isNa} disabled={criterion.naTreatment === "NEVER_NA"} onChange={(e) => replaceScore(index, { isNa: e.target.checked })} />
                              N/A ({criterion.naTreatment.replaceAll("_", " ")})
                            </label>
                            <input className="input" placeholder="Remarks" value={item.remarks} onChange={(e) => replaceScore(index, { remarks: e.target.value })} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <ScorePreview preview={preview} onSave={saveScorecard} saving={saving} />
          </div>
        </div>
        <div className={tab === "Recommendation" ? undefined : "hidden"}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm text-slate-500">Current recommendation</div>
              <div className="mt-2 text-3xl font-bold">{loan.scorecard?.result ?? "Not scored"}</div>
              <div className="mt-2 text-sm text-slate-600">Overall score: {loan.scorecard ? `${Number(loan.scorecard.overallScore).toFixed(2)}%` : "-"}</div>
              {loan.scorecard?.autoDqReason ? <pre className="mt-3 whitespace-pre-wrap rounded-md bg-red-50 p-3 text-sm text-red-700">{loan.scorecard.autoDqReason}</pre> : null}
            </div>
            <div>
              <div className="text-sm font-semibold">Committee routing/history</div>
              <div className="mt-2 space-y-2">
                {loan.committeeReviews?.length ? loan.committeeReviews.map((review: any) => (
                  <div key={review.id} className="rounded-md bg-slate-50 p-3 text-sm">
                    <div className="font-medium">{review.creditCommittee.committeeName}</div>
                    <div>{review.reviewer.fullName}: {review.decision.replaceAll("_", " ")}</div>
                    {review.remarks ? <div className="text-slate-500">{review.remarks}</div> : null}
                  </div>
                )) : <div className="text-sm text-slate-500">No committee route yet.</div>}
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="no-print mt-4 flex flex-wrap gap-2">
        <button className="btn-primary" disabled={saving} type="submit"><Save size={16} /> Save CI/BI details</button>
        <button className="btn-secondary" disabled={saving} type="button" onClick={saveScorecard}><Calculator size={16} /> Save scorecard</button>
        <button className="btn-secondary" disabled={saving} type="button" onClick={async () => { await fetch(`/api/loans/${loan.id}/submit`, { method: "POST" }); router.refresh(); }}><Send size={16} /> Route to committee</button>
        <Link className="btn-secondary" href={`/reports/${loan.id}`}><Printer size={16} /> Printable report</Link>
      </div>
    </form>
  );

  function replaceScore(index: number, patch: Partial<{ score: number; isNa: boolean; remarks: string }>) {
    setScoreItems((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }
}

function ScorePreview({ preview, onSave, saving }: { preview: any; onSave: () => void; saving: boolean }) {
  return (
    <aside className="sticky top-20 h-fit rounded-md border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold">Real-time computation</div>
      <div className="mt-3 space-y-2 text-sm">
        {Object.entries(preview.categoryScores).map(([category, value]) => (
          <div key={category} className="flex justify-between"><span>{category}</span><strong>{Number(value).toFixed(2)}%</strong></div>
        ))}
      </div>
      <div className="mt-4 border-t border-slate-200 pt-4">
        <div className="text-sm text-slate-500">Overall score</div>
        <div className="text-3xl font-bold">{preview.overall.toFixed(2)}%</div>
        <div className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold">{preview.result.replaceAll("_", " ")}</div>
      </div>
      {preview.autoDq.length ? <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">Auto-DQ triggered by {preview.autoDq.map((item: any) => item.code).join(", ")}.</div> : null}
      <button type="button" className="btn-primary mt-4 w-full" disabled={saving} onClick={onSave}>Save scorecard</button>
    </aside>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-3">{children}</div>;
}

function LabelText({ icon: Icon, children }: { icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="label flex items-center gap-1.5">
      {Icon ? <Icon size={15} className="shrink-0 text-alc-blue" /> : null}
      <span>{children}</span>
    </span>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  icon,
  placeholder,
  step,
  money,
  onChange
}: {
  label: string;
  name: string;
  defaultValue?: any;
  type?: string;
  icon?: LucideIcon;
  placeholder?: string;
  step?: string;
  money?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <label>
      <LabelText icon={icon}>{label}</LabelText>
      {money ? (
        <MoneyInput className="input mt-1" name={name} defaultValue={defaultValue} placeholder={placeholder} />
      ) : (
        <input
          className="input mt-1"
          name={name}
          type={type}
          step={step}
          placeholder={placeholder}
          defaultValue={defaultValue ?? ""}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        />
      )}
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 mt-5 border-b border-slate-200 pb-1 text-sm font-semibold text-slate-700 first:mt-0 md:text-base">{children}</h3>;
}

function Select({ label, name, defaultValue, options, icon }: { label: string; name: string; defaultValue?: any; options: string[]; icon?: LucideIcon }) {
  return (
    <label>
      <LabelText icon={icon}>{label}</LabelText>
      <select className="input mt-1" name={name} defaultValue={defaultValue ?? ""}>
        <option value="" disabled>Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function AddressFields({
  cascade,
  prefix,
  street,
  onStreetChange
}: {
  cascade: ReturnType<typeof useAddressCascade>;
  prefix: string;
  street: string;
  onStreetChange: (value: string) => void;
}) {
  return (
    <div className="mt-2 grid gap-3 md:grid-cols-3">
      <label>
        <LabelText icon={MapIcon}>Region</LabelText>
        <select className="input mt-1" name={`${prefix}Region`} value={cascade.region} onChange={(e) => cascade.setRegion(e.target.value)}>
          <option value="">Select region</option>
          {cascade.regionOptions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </label>
      <label>
        <LabelText icon={MapPin}>Province</LabelText>
        <select className="input mt-1" name={`${prefix}Province`} value={cascade.province} onChange={(e) => cascade.setProvince(e.target.value)} disabled={!cascade.region}>
          <option value="">Select province</option>
          {cascade.provinceOptions.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </label>
      <label>
        <LabelText icon={Building2}>City / Municipality</LabelText>
        <select className="input mt-1" name={`${prefix}CityMunicipality`} value={cascade.city} onChange={(e) => cascade.setCity(e.target.value)} disabled={!cascade.province}>
          <option value="">Select city/municipality</option>
          {cascade.cityOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>
      <label>
        <LabelText icon={MapPinned}>Barangay</LabelText>
        <select className="input mt-1" name={`${prefix}Barangay`} value={cascade.barangay} onChange={(e) => cascade.setBarangay(e.target.value)} disabled={!cascade.city}>
          <option value="">Select barangay</option>
          {cascade.barangayOptions.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </label>
      <label className="md:col-span-2">
        <LabelText icon={Home}>House No./Bldg. No./Purok/Subdivision/Village</LabelText>
        <input className="input mt-1" name={`${prefix}Street`} value={street} onChange={(e) => onStreetChange(e.target.value)} />
      </label>
    </div>
  );
}

function TextArea({ label, name, defaultValue }: { label: string; name: string; defaultValue?: any }) {
  return (
    <label className="md:col-span-3">
      <span className="label">{label}</span>
      <textarea className="input mt-1 min-h-24" name={name} defaultValue={defaultValue ?? ""} />
    </label>
  );
}

function Rows({ prefix, rows, fields }: { prefix: string; rows: any[]; fields: string[] }) {
  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <div key={index} className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-3">
          {fields.map((field) => <Field key={field} name={`${prefix}.${index}.${field}`} label={labelize(field)} defaultValue={row[field]} />)}
        </div>
      ))}
    </div>
  );
}

/** Strips everything that is not a digit or a single decimal point, capped at two decimals. */
function sanitizeMoney(input: string) {
  let value = String(input ?? "").replace(/[^\d.]/g, "");
  const parts = value.split(".");
  if (parts.length > 2) value = `${parts[0]}.${parts.slice(1).join("")}`;
  const [whole, decimals] = value.split(".");
  return decimals === undefined ? whole : `${whole}.${decimals.slice(0, 2)}`;
}

/** Adds thousands separators for display while the raw value stays comma-free. */
function displayMoney(raw: string) {
  if (raw === "") return "";
  const [whole, decimals] = raw.split(".");
  const grouped = whole === "" ? "" : Number(whole).toLocaleString("en-US");
  return decimals === undefined ? grouped : `${grouped}.${decimals}`;
}

function padMoney(raw: string) {
  if (raw === "") return "";
  const amount = Number(raw);
  return Number.isFinite(amount) ? amount.toFixed(2) : "";
}

/**
 * Numeric money input: accepts digits and one decimal point only, shows thousands separators
 * while typing and settles to two decimals on blur. Uncontrolled use posts the raw, comma-free
 * value through a hidden field so FormData-driven sections keep working unchanged.
 */
function MoneyInput({
  name,
  defaultValue,
  value,
  onChange,
  className = "input",
  placeholder
}: {
  name?: string;
  defaultValue?: any;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const controlled = onChange !== undefined;
  const [internal, setInternal] = useState(() => padMoney(sanitizeMoney(String(defaultValue ?? ""))));
  const raw = controlled ? sanitizeMoney(String(value ?? "")) : internal;
  const set = (next: string) => (controlled ? onChange!(next) : setInternal(next));

  return (
    <>
      <input
        className={className}
        inputMode="decimal"
        value={displayMoney(raw)}
        onChange={(e) => set(sanitizeMoney(e.target.value))}
        onBlur={() => set(padMoney(raw))}
        placeholder={placeholder ?? "0.00"}
      />
      {name ? <input type="hidden" name={name} value={raw} /> : null}
    </>
  );
}

type RowField = { name: string; label: string; kind?: "text" | "number" | "date" | "money" };
type RowState = Record<string, string>;

function blankRow(fields: RowField[]): RowState {
  return Object.fromEntries(fields.map((field) => [field.name, ""]));
}

/** Normalises rows loaded from the database into editable strings, always leaving one row to type into. */
function toRowState(rows: any[] | undefined, fields: RowField[]): RowState[] {
  if (!rows?.length) return [blankRow(fields)];
  return rows.map((row) =>
    Object.fromEntries(
      fields.map((field) => {
        const value = row[field.name];
        if (value === null || value === undefined) return [field.name, ""];
        if (field.kind === "date") return [field.name, String(value).slice(0, 10)];
        if (field.kind === "money") return [field.name, padMoney(sanitizeMoney(String(value)))];
        return [field.name, String(value)];
      })
    )
  );
}

/** Drops rows the user never filled in, so a trailing blank row is not persisted. */
function filledRows(rows: RowState[], extra: Record<string, unknown> = {}) {
  return rows.filter((row) => Object.values(row).some((value) => String(value ?? "").trim())).map((row) => ({ ...row, ...extra }));
}

/**
 * Repeating rows rendered as a table on laptop/desktop and stacked cards on small screens,
 * matching the Cash Flow tab. Values are held in React state rather than posted form fields.
 */
function RowTable({
  title,
  fields,
  rows,
  setRows
}: {
  title: string;
  fields: RowField[];
  rows: RowState[];
  setRows: (updater: (rows: RowState[]) => RowState[]) => void;
}) {
  const update = (index: number, name: string, value: string) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, [name]: value } : row)));
  const remove = (index: number) =>
    setRows((current) => (current.length === 1 ? [blankRow(fields)] : current.filter((_, i) => i !== index)));
  const inputType = (field: RowField) => (field.kind === "date" ? "date" : field.kind === "number" ? "number" : "text");

  return (
    <div>
      <SectionTitle>{title}</SectionTitle>

      {/* Laptop and desktop: one editable table row per entry. */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm" style={{ minWidth: `${Math.max(720, fields.length * 170 + 120)}px` }}>
          <thead>
            <tr className="table-head">
              {fields.map((field) => (
                <th key={field.name} className="border-b border-slate-200 px-3 py-2">{field.label}</th>
              ))}
              <th className="border-b border-slate-200 px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="align-top">
                {fields.map((field) => (
                  <td key={field.name} className="border-b border-slate-100 px-3 py-2">
                    {field.kind === "money" ? (
                      <MoneyInput value={row[field.name] ?? ""} onChange={(next) => update(index, field.name, next)} />
                    ) : (
                      <input
                        className="input"
                        type={inputType(field)}
                        step={field.kind === "number" ? "0.01" : undefined}
                        value={row[field.name] ?? ""}
                        onChange={(e) => update(index, field.name, e.target.value)}
                      />
                    )}
                  </td>
                ))}
                <td className="border-b border-slate-100 px-3 py-2 text-right">
                  <button type="button" className="btn-secondary" onClick={() => remove(index)}>
                    <Trash2 /> Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Small screens: stacked card per entry. */}
      <div className="space-y-4 md:hidden">
        {rows.map((row, index) => (
          <div key={index} className="rounded-md border border-slate-200 p-3">
            {fields.map((field) => (
              <label key={field.name} className="mt-3 block first:mt-0">
                <LabelText>{field.label}</LabelText>
                {field.kind === "money" ? (
                  <MoneyInput className="input mt-1" value={row[field.name] ?? ""} onChange={(next) => update(index, field.name, next)} />
                ) : (
                  <input
                    className="input mt-1"
                    type={inputType(field)}
                    step={field.kind === "number" ? "0.01" : undefined}
                    value={row[field.name] ?? ""}
                    onChange={(e) => update(index, field.name, e.target.value)}
                    placeholder={field.label}
                  />
                )}
              </label>
            ))}
            <button type="button" className="btn-secondary mt-3 w-full" onClick={() => remove(index)}>
              <Trash2 /> Remove row
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <button type="button" className="btn-primary" onClick={() => setRows((current) => [...current, blankRow(fields)])}>
          <Plus /> Add row
        </button>
      </div>
    </div>
  );
}

function collectRows(form: FormData, prefix: string, fields: string[]) {
  const rows: Record<string, any>[] = [];
  for (let index = 0; index < 10; index++) {
    const row: Record<string, any> = {};
    let hasValue = false;
    for (const field of fields) {
      const value = form.get(`${prefix}.${index}.${field}`);
      row[field] = value;
      if (String(value ?? "").trim()) hasValue = true;
    }
    if (hasValue) rows.push(row);
  }
  return rows;
}

function labelize(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}
