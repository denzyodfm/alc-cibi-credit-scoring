import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { PrintButton } from "@/components/PrintButton";
import { canAccessBranch, requireUser } from "@/lib/auth";
import { dateText, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function PrintableReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: rawId } = await params;
  const loan = await prisma.loanApplication.findUnique({
    where: { id: Number(rawId) },
    include: {
      branch: true,
      loanOfficer: true,
      endorser: true,
      applicantProfile: true,
      householdBackground: true,
      incomeProfile: true,
      liabilities: true,
      references: true,
      assets: true,
      collateral: true,
      attachedProperties: true,
      businessContacts: true,
      cashFlows: { orderBy: { sortOrder: "asc" } },
      cropProductions: true,
      farmCostItems: true,
      scorecard: { include: { items: { orderBy: [{ category: "asc" }, { subCriterionCode: "asc" }] } } }
    }
  });
  if (!loan || !canAccessBranch(user, loan.branchId)) notFound();

  const household = loan.householdBackground;
  const income = loan.incomeProfile;
  const sources = String(income?.employmentStatus ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const hasSource = (...names: string[]) => names.some((name) => sources.includes(name));

  const totalIncome = loan.cashFlows.reduce((sum, row) => sum + Number(row.income ?? 0), 0);
  const totalExpense = loan.cashFlows.reduce((sum, row) => sum + Number(row.expense ?? 0), 0);
  const suppliers = loan.businessContacts.filter((row) => row.kind === "SUPPLIER");
  const customers = loan.businessContacts.filter((row) => row.kind === "CUSTOMER");
  const landCollateral = loan.collateral.filter((row) => row.collateralType !== "Chattel");
  const chattelCollateral = loan.collateral.filter((row) => row.collateralType === "Chattel");

  return (
    <AppShell user={user}>
      <PageHeader title="Printable CI/BI Report" description={loan.applicationNo} action={<PrintButton />} />
      <div className="panel p-6 print:border-0 print:shadow-none">
        <div className="flex justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold">Agusan Lending Corporation</h1>
            <p className="text-sm text-slate-600">CI/BI and 5C Credit Scorecard Report</p>
          </div>
          <div className="text-right text-sm">
            <div>{loan.branch.branchName} ({loan.branchCode})</div>
            <div>{dateText(loan.dateOfCi)}</div>
          </div>
        </div>

        <Section title="Loan Details">
          <Info label="Application no." value={loan.applicationNo} />
          <Info label="CI form no." value={loan.ciFormNo} />
          <Info label="Date of CI" value={dateText(loan.dateOfCi)} />
          <Info label="Loan officer" value={loan.loanOfficer.fullName} />
          <Info label="Branch" value={`${loan.branchCode} / ${loan.branch.branchName}`} />
          <Info label="Product" value={loan.loanProduct} />
          <Info label="Amount applied" value={money(loan.amountApplied)} />
          <Info label="Desired terms" value={loan.desiredTerms} />
          <Info label="Proposed amortization" value={loan.proposedAmortization == null ? "-" : money(loan.proposedAmortization)} />
          <Info label="Status" value={loan.status.replaceAll("_", " ")} />
          <Info label="Purpose" value={loan.loanPurpose} wide />
        </Section>

        <Section title="Applicant Details">
          <Info label="Full name" value={loan.applicantProfile?.fullName} />
          <Info label="Nickname" value={loan.applicantProfile?.nickname} />
          <Info label="Place of birth" value={loan.applicantProfile?.placeOfBirth} />
          <Info label="Date of birth" value={dateText(loan.applicantProfile?.dateOfBirth)} />
          <Info label="Age" value={loan.applicantProfile?.age} />
          <Info label="Sex" value={loan.applicantProfile?.sex} />
          <Info label="Civil status" value={loan.applicantProfile?.civilStatus} />
          <Info label="Years at address" value={loan.applicantProfile?.yearsAtAddress} />
          <Info label="Type of residence" value={loan.applicantProfile?.residenceType} />
          <Info
            label="Monthly rent/mortgage"
            value={loan.applicantProfile?.monthlyRentOrMortgage == null ? "-" : money(loan.applicantProfile.monthlyRentOrMortgage)}
          />
          <Info label="Current address" value={loan.applicantProfile?.currentAddress} wide />
          <Info label="Permanent address" value={loan.applicantProfile?.permanentAddress} wide />
        </Section>

        <Section title="Contact Information">
          <Info label="Contact number" value={loan.applicantProfile?.contactNumber} />
          <Info label="Alternate contact" value={loan.applicantProfile?.alternateContact} />
          <Info label="Email address" value={loan.applicantProfile?.email} />
          <Info label="Alternate email" value={loan.applicantProfile?.alternateEmail} />
          <Info label="Gcash number" value={loan.applicantProfile?.gcashNumber} />
          <Info label="Facebook" value={loan.applicantProfile?.facebook} />
          <Info label="Twitter" value={loan.applicantProfile?.twitter} />
          <Info label="TikTok" value={loan.applicantProfile?.tiktok} />
          <Info label="Instagram" value={loan.applicantProfile?.instagram} />
        </Section>

        <Section title="Government IDs">
          <Info label="TIN no." value={loan.applicantProfile?.tinNo} />
          <Info label="SSS ID" value={loan.applicantProfile?.sssId} />
          <Info label="GSIS ID" value={loan.applicantProfile?.gsisId} />
          <Info label="PhilHealth no." value={loan.applicantProfile?.philhealthNo} />
          <Info label="Pag-Ibig no." value={loan.applicantProfile?.pagibigNo} />
          <Info label="Drivers license" value={loan.applicantProfile?.driversLicense} />
        </Section>

        <Section title="Family &amp; Household Background">
          <Info label="Spouse/partner name" value={household?.spousePartnerName} />
          <Info label="Spouse nickname" value={household?.spouseNickname} />
          <Info label="Spouse years at address" value={household?.spouseYearsAtAddress} />
          <Info label="Spouse current address" value={household?.spouseCurrentAddress} wide />
          <Info label="Spouse occupation/employer" value={household?.spouseOccupationEmployer} />
          <Info label="Spouse employer address" value={household?.spouseEmployerAddress} />
          <Info label="Spouse monthly income" value={household?.spouseMonthlyIncome == null ? "-" : money(household.spouseMonthlyIncome)} />
          <Info label="No. of dependents" value={household?.numberOfDependents} />
          <Info label="Dependents under 18" value={household?.dependentsUnder18} />
          <Info label="Primary income earner" value={household?.isPrimaryIncomeEarner == null ? "-" : household.isPrimaryIncomeEarner ? "Yes" : "No"} />
          <Info label="Father's name" value={household?.fatherName} />
          <Info label="Father DOB / DOD" value={`${dateText(household?.fatherDob)} / ${dateText(household?.fatherDod)}`} />
          <Info label="Father age / occupation" value={`${household?.fatherAge ?? "-"} / ${household?.fatherOccupation ?? "-"}`} />
          <Info label="Mother's name" value={household?.motherName} />
          <Info label="Mother DOB / DOD" value={`${dateText(household?.motherDob)} / ${dateText(household?.motherDod)}`} />
          <Info label="Mother age / occupation" value={`${household?.motherAge ?? "-"} / ${household?.motherOccupation ?? "-"}`} />
          <Info label="Address of parent" value={household?.parentAddress} wide />
        </Section>

        <Section title="Source of Income">
          <Info label="Employment status" value={income?.employmentStatus} wide />
          {income?.employmentStatusOther ? <Info label="Other" value={income.employmentStatusOther} wide /> : null}
        </Section>

        {hasSource("Employed") ? (
          <Section title="For Employed Applicants">
            <Info label="Employer name" value={income?.employerName} />
            <Info label="Position/designation" value={income?.positionDesignation} />
            <Info label="Employment type" value={income?.employmentType} />
            <Info label="Company address" value={income?.companyAddress} />
            <Info label="Length of service" value={income?.lengthOfService} />
            <Info label="HR/supervisor" value={income?.hrSupervisorNameContact} />
            <Info label="Gross monthly salary" value={income?.grossMonthlySalary == null ? "-" : money(income.grossMonthlySalary)} />
            <Info label="Net monthly take-home" value={income?.netMonthlyTakeHomePay == null ? "-" : money(income.netMonthlyTakeHomePay)} />
            <Info label="Bank and branch" value={income?.bankBranch} />
            <Info label="Account number" value={income?.accountNumber} />
            <Info label="Notes" value={income?.notes} wide />
          </Section>
        ) : null}

        {hasSource("Pensioner") ? (
          <Section title="For Pension Applicants">
            <Info label="Type of pension" value={income?.pensionType} />
            <Info label="SSS/GSIS no." value={income?.pensionSssGsisNo} />
            <Info label="Monthly pension" value={income?.pensionMonthlyAmount == null ? "-" : money(income.pensionMonthlyAmount)} />
            <Info label="Date pension started" value={dateText(income?.pensionStartDate)} />
            <Info label="Bank and branch" value={income?.pensionBankBranch} />
            <Info label="Account number" value={income?.pensionAccountNumber} />
            <Info label="Deceased member" value={income?.pensionDeceasedMember} />
            <Info label="Deceased SSS/GSIS no." value={income?.deceasedMemberSssGsisNo} />
            <Info label="Deceased monthly pension" value={income?.deceasedMemberMonthlyPension == null ? "-" : money(income.deceasedMemberMonthlyPension)} />
            <Info label="Deceased pension started" value={dateText(income?.deceasedMemberPensionStart)} />
            <Info label="Deceased bank and branch" value={income?.deceasedMemberBankBranch} />
            <Info label="Deceased account number" value={income?.deceasedMemberAccountNumber} />
            <Info label="Relationship to" value={income?.pensionRelationshipTo} />
            <Info label="Survivor ID" value={income?.pensionSurvivorId} />
            <Info label="Total years of WE service" value={income?.pensionTotalYearsWeService} />
            <Info label="Live-in partner" value={income?.pensionLiveInPartner} />
            <Info label="Proof of relationship" value={income?.pensionProofOfRelationship} wide />
            <Info label="Health risk assessment" value={income?.pensionHealthRiskAssessment} wide />
            <Info label="Notes" value={income?.pensionNotes} wide />
          </Section>
        ) : null}

        {hasSource("OFW") ? (
          <Section title="For OFW Applicants">
            <Info label="OFW status" value={income?.ofwStatus} />
            <Info label="Country of deployment" value={income?.countryOfDeployment} />
            <Info label="Name of the company" value={income?.ofwCompanyName} />
            <Info label="Nature of work" value={income?.natureOfWork} />
            <Info label="Hiring" value={income?.hiringType} />
            <Info label="Job title" value={income?.jobTitle} />
            <Info label="Industry" value={income?.industry} />
            <Info label="Contract start" value={dateText(income?.contractStartDate)} />
            <Info label="Contract end" value={dateText(income?.contractEndDate)} />
            <Info label="Monthly salary (foreign)" value={income?.monthlySalaryForeign == null ? "-" : money(income.monthlySalaryForeign)} />
            <Info label="Monthly salary (PHP)" value={income?.monthlySalaryPhp == null ? "-" : money(income.monthlySalaryPhp)} />
            <Info label="Remittance frequency" value={income?.remittanceFrequency} />
            <Info label="Recruitment agency" value={income?.ofwRecruitmentAgency} />
            <Info label="Agency address" value={income?.ofwAgencyAddress} />
            <Info label="DMW license" value={income?.ofwDmwiLicense} />
            <Info label="Total years as OFW" value={income?.ofwTotalYears} />
            <Info label="OWWA membership" value={income?.owwaMembership} />
            <Info label="OWWA no." value={income?.owwaNo} />
            <Info label="SSS status" value={income?.ofwSssStatus} />
            <Info label="Pag-Ibig status" value={income?.ofwPagibigStatus} />
            <Info label="Phil-Health" value={income?.ofwPhilhealthStatus} />
            <Info label="Name of OFW" value={income?.ofwName} />
            <Info label="Authorized representative" value={income?.ofwAuthorizedRepresentative} />
            <Info label="Relationship to OFW" value={income?.ofwRepRelationship} />
            <Info label="Complete address" value={income?.ofwRepCompleteAddress} wide />
            <Info label="Email address" value={income?.ofwEmail} />
            <Info label="Alternate email" value={income?.ofwAlternateEmail} />
            <Info label="Gcash number" value={income?.ofwGcashNumber} />
            <Info label="Facebook" value={income?.ofwFacebook} />
            <Info label="Bank and branch" value={income?.ofwBankBranch} />
            <Info label="Account number" value={income?.ofwAccountNumber} />
          </Section>
        ) : null}

        {hasSource("Self Employed", "Business Owner") ? (
          <>
            <Section title="For Self-employed / Business Owners">
              <Info label="Business name" value={income?.businessName} />
              <Info label="Business address" value={income?.businessAddress} />
              <Info label="DTI/SEC/CDA registration no." value={income?.businessRegistrationNo} />
              <Info label="Nature of business" value={income?.natureOfBusiness} />
              <Info label="Years of operations" value={income?.yearsOfOperations} />
              <Info label="Avg monthly gross revenue" value={income?.averageMonthlyGrossRevenue == null ? "-" : money(income.averageMonthlyGrossRevenue)} />
              <Info label="Avg monthly net income" value={income?.averageMonthlyNetIncome == null ? "-" : money(income.averageMonthlyNetIncome)} />
              <Info label="Bank and branch" value={income?.businessBankBranch} />
              <Info label="Account number" value={income?.businessAccountNumber} />
              <Info label="Depositor since" value={income?.businessDepositorSince} />
              <Info label="Account type" value={income?.businessAccountType} />
            </Section>
            <Table
              title="Top 3 Suppliers"
              headers={["Name", "Service/product", "Contact info"]}
              rows={suppliers.map((row) => [row.name, row.serviceProduct, row.contactInfo])}
            />
            <Table
              title="Top 3 Customers"
              headers={["Name", "Service/product", "Contact info"]}
              rows={customers.map((row) => [row.name, row.serviceProduct, row.contactInfo])}
            />
          </>
        ) : null}

        {hasSource("Farmer/Agricultural") ? (
          <>
            <Section title="For Farmers and Agricultural Sector">
              <Info label="Type of farming" value={income?.farmingType} />
              <Info label="Main product" value={income?.mainProduct} />
              <Info label="Farmer type" value={income?.farmerType} />
              <Info label="Coop association" value={income?.coopAssociation} />
              <Info label="Farm location" value={income?.farmLocation} />
              <Info label="Distance from residence" value={income?.distanceFromResidence} />
              <Info label="RSBSA registered" value={income?.rsbsaRegistered} />
              <Info label="Years of experience" value={income?.yearsOfExperience} />
              <Info label="Area cultivated (ha)" value={income?.areaCultivated} />
              <Info label="Lease duration" value={income?.leaseDuration} />
              <Info label="Rent amount" value={income?.rentAmount == null ? "-" : money(income.rentAmount)} />
              <Info label="Water reliability" value={income?.waterReliability} />
              <Info label="Accessibility" value={income?.accessibility} />
              <Info label="Land owner" value={income?.landOwner} />
              <Info label="Land owner address" value={income?.landOwnerAddress} />
              <Info label="Title no." value={income?.landTitleNo} />
              <Info label="Tax declaration" value={income?.landTaxDeclaration} />
              <Info label="Type of title" value={income?.landTypeOfTitle} />
              <Info label="TIN no." value={income?.landTinNo} />
              <Info label="Buyer name" value={income?.buyerName} />
              <Info label="Buyer address" value={income?.buyerAddress} />
              <Info label="Buyer contact info" value={income?.buyerContactInfo} />
              <Info label="Planting arrangement" value={income?.plantingArrangement} wide />
              <Info label="Sharing arrangement" value={income?.sharingArrangement} wide />
              <Info label="Land characteristics" value={income?.landCharacteristics} wide />
              <Info label="Farm risk assessment" value={income?.farmRiskAssessment} wide />
            </Section>
            <Table
              title="Crop Production Profile"
              headers={["Item", "Current season", "Last season", "Next season estimate"]}
              rows={loan.cropProductions.map((row) => [row.item, row.currentSeason, row.lastSeason, row.nextSeasonEstimate])}
            />
            <Table
              title="Farm Cost Breakdown"
              headers={["Cost item", "QTY/basis", "Cost per unit", "Total cost", "Remarks"]}
              rows={loan.farmCostItems.map((row) => [
                row.costItem,
                row.qtyBasis,
                row.costPerUnit == null ? "-" : money(row.costPerUnit),
                row.totalCost == null ? "-" : money(row.totalCost),
                row.remarks
              ])}
            />
          </>
        ) : null}

        <Table
          title="Financial Cash Flow"
          headers={["Income/Expense", "Description", "Amount", "Frequency", "Income", "Expense"]}
          rows={loan.cashFlows.map((row) => [
            row.entryType,
            row.description,
            row.amount == null ? "-" : money(row.amount),
            row.frequency,
            row.income == null ? "-" : money(row.income),
            row.expense == null ? "-" : money(row.expense)
          ])}
          footer={["Monthly total", "", "", "", money(totalIncome), money(totalExpense)]}
        />

        <Table
          title="Existing Loans and Liabilities"
          headers={["Creditor", "Purpose", "Original amount", "Outstanding balance", "Monthly obligation", "Due date", "Status"]}
          rows={loan.liabilities.map((row) => [
            row.creditor,
            row.purpose,
            row.originalAmount == null ? "-" : money(row.originalAmount),
            row.outstandingBalance == null ? "-" : money(row.outstandingBalance),
            row.monthlyObligation == null ? "-" : money(row.monthlyObligation),
            dateText(row.dueDate),
            row.loanStatus
          ])}
        />

        <Table
          title="Character and Repayment Behavior"
          headers={["Reference name", "Role/relationship", "Contact no.", "Key feedback"]}
          rows={loan.references.map((row) => [row.referenceName, row.relationship, row.contactNo, row.keyFeedback])}
        />

        <Table
          title="Assets Capital and Collateral"
          headers={["Asset", "Description", "Condition", "Estimated value", "Owned by"]}
          rows={loan.assets.map((row) => [
            row.assetType,
            row.description,
            row.conditionStatus,
            row.estimatedValue == null ? "-" : money(row.estimatedValue),
            row.ownedBy
          ])}
        />

        <Table
          title="Collateral (Land)"
          headers={["Registered owner", "Title no.", "Location", "Area", "Declared value", "Assessed value", "Market value", "Appraised value", "Last appraised"]}
          rows={landCollateral.map((row) => [
            row.registeredOwner,
            row.titleNo,
            row.location,
            row.area,
            row.declaredValue == null ? "-" : money(row.declaredValue),
            row.assessedValue == null ? "-" : money(row.assessedValue),
            row.marketValue == null ? "-" : money(row.marketValue),
            row.appraisedValue == null ? "-" : money(row.appraisedValue),
            dateText(row.dateLastAppraised)
          ])}
        />

        <Table
          title="Attached Properties to Land"
          headers={["Tax declaration no.", "Description", "Condition", "Assessed value", "Appraised value"]}
          rows={loan.attachedProperties.map((row) => [
            row.taxDeclarationNo,
            row.description,
            row.conditionStatus,
            row.assessedValue == null ? "-" : money(row.assessedValue),
            row.appraisedValue == null ? "-" : money(row.appraisedValue)
          ])}
        />

        <Table
          title="Chattel"
          headers={["Registered owner", "CR no.", "OR no.", "Model", "Make", "Chassis no.", "Engine no.", "Acquired", "Appraised value"]}
          rows={chattelCollateral.map((row) => [
            row.registeredOwner,
            row.vehicleCrNo,
            row.vehicleOrNo,
            row.vehicleModel,
            row.vehicleMake,
            row.chassisNo,
            row.engineNo,
            dateText(row.dateAcquired),
            row.appraisedValue == null ? "-" : money(row.appraisedValue)
          ])}
        />

        <Section title="5C Scorecard">
          <Info label="Character" value={loan.scorecard ? `${Number(loan.scorecard.characterScore).toFixed(2)}%` : "-"} />
          <Info label="Capacity" value={loan.scorecard ? `${Number(loan.scorecard.capacityScore).toFixed(2)}%` : "-"} />
          <Info label="Capital" value={loan.scorecard ? `${Number(loan.scorecard.capitalScore).toFixed(2)}%` : "-"} />
          <Info label="Collateral" value={loan.scorecard ? `${Number(loan.scorecard.collateralScore).toFixed(2)}%` : "-"} />
          <Info label="Conditions" value={loan.scorecard ? `${Number(loan.scorecard.conditionsScore).toFixed(2)}%` : "-"} />
          <Info label="Overall" value={loan.scorecard ? `${Number(loan.scorecard.overallScore).toFixed(2)}%` : "-"} />
          <Info label="Recommendation" value={loan.scorecard?.result} />
          <Info label="Auto-DQ reason" value={loan.scorecard?.autoDqReason} wide />
        </Section>
        <div className="overflow-x-auto">
        <table className="mt-4 w-full min-w-[560px] text-sm">
          <thead className="table-head"><tr><th className="px-3 py-2">Code</th><th className="px-3 py-2">Criterion</th><th className="px-3 py-2">Score</th><th className="px-3 py-2">N/A</th><th className="px-3 py-2">Remarks</th></tr></thead>
          <tbody>
            {loan.scorecard?.items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{item.subCriterionCode}</td>
                <td className="px-3 py-2">{item.subCriterionName}</td>
                <td className="px-3 py-2">{item.score}</td>
                <td className="px-3 py-2">{item.isNa ? item.naTreatment.replaceAll("_", " ") : "No"}</td>
                <td className="px-3 py-2">{item.remarks}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {loan.endorsedAt ? (
          <Section title="Endorsement">
            <Info label="Endorsed by" value={loan.endorser?.fullName} />
            <Info label="Endorsed at" value={dateText(loan.endorsedAt)} />
            <Info label="Endorsement code" value={loan.endorsementCode} />
            <Info label="Remarks" value={loan.endorsementRemarks} wide />
          </Section>
        ) : null}
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 break-inside-avoid">
      <h2 className="border-b border-slate-200 pb-2 text-lg font-bold">{title}</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-3">{children}</div>
    </section>
  );
}

function Info({ label, value, wide }: { label: string; value: unknown; wide?: boolean }) {
  const text = value === null || value === undefined || value === "" ? "-" : String(value);
  return (
    <div className={wide ? "md:col-span-3" : ""}>
      <div className="label">{label}</div>
      <div className="mt-1 text-sm">{text}</div>
    </div>
  );
}

/** Repeating section rendered as a table; hidden entirely when the applicant has no rows for it. */
function Table({
  title,
  headers,
  rows,
  footer
}: {
  title: string;
  headers: string[];
  rows: unknown[][];
  footer?: unknown[];
}) {
  if (!rows.length) return null;
  return (
    <section className="mt-5 break-inside-avoid">
      <h2 className="border-b border-slate-200 pb-2 text-lg font-bold">{title}</h2>
      <div className="overflow-x-auto">
        <table className="mt-3 w-full text-sm" style={{ minWidth: `${Math.max(560, headers.length * 130)}px` }}>
          <thead className="table-head">
            <tr>{headers.map((header) => <th key={header} className="px-3 py-2 text-left">{header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-slate-100">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-2">{cell === null || cell === undefined || cell === "" ? "-" : String(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer ? (
            <tfoot>
              <tr className="border-t-2 border-slate-300 font-semibold">
                {footer.map((cell, index) => (
                  <td key={index} className="px-3 py-2">{cell === null || cell === undefined || cell === "" ? "" : String(cell)}</td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </section>
  );
}
