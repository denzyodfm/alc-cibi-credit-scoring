import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pickWritable, pickWritableRows, writableFields } from "../src/lib/model-fields";

describe("writableFields", () => {
  it("never exposes identity or audit columns", () => {
    const allowed = writableFields("ApplicantProfile");
    for (const blocked of ["id", "loanApplicationId", "createdAt", "updatedAt"]) {
      assert.equal(allowed.has(blocked), false, `${blocked} must not be client-writable`);
    }
  });

  it("never exposes the applicant photo, which has its own validated route", () => {
    const allowed = writableFields("ApplicantProfile");
    assert.equal(allowed.has("photoDataUrl"), false);
    assert.equal(allowed.has("photoMimeType"), false);
  });

  it("still allows the ordinary form columns", () => {
    const allowed = writableFields("ApplicantProfile");
    for (const field of ["nickname", "placeOfBirth", "contactNumber", "tinNo"]) {
      assert.equal(allowed.has(field), true, `${field} should be writable`);
    }
  });

  it("throws on an unknown model rather than silently allowing everything", () => {
    assert.throws(() => writableFields("NotAModel"), /Unknown Prisma model/);
  });
});

describe("pickWritable", () => {
  it("drops unknown keys and keeps legitimate ones", () => {
    const result = pickWritable("ApplicantProfile", { nickname: "Juan", totallyMadeUp: "x" });
    assert.deepEqual(result, { nickname: "Juan" });
  });

  it("reports what it dropped, qualified by model", () => {
    const dropped: string[] = [];
    pickWritable("ApplicantProfile", { nickname: "Juan", photoDataUrl: "data:text/html;base64,x" }, dropped);
    assert.deepEqual(dropped, ["ApplicantProfile.photoDataUrl"]);
  });

  it("blocks the photo bypass that the loan save route was vulnerable to", () => {
    const result = pickWritable("ApplicantProfile", { photoDataUrl: "data:text/html;base64,PHNjcmlwdD4=" });
    assert.deepEqual(result, {});
  });

  it("tolerates a missing payload", () => {
    assert.deepEqual(pickWritable("ApplicantProfile", undefined), {});
  });
});

describe("pickWritableRows", () => {
  it("filters every row and accumulates all drops", () => {
    const dropped: string[] = [];
    const rows = pickWritableRows(
      "ExistingLiability",
      [
        { creditor: "BDO", bogus: 1 },
        { creditor: "PNB", alsoBogus: 2 }
      ],
      dropped
    );
    assert.deepEqual(rows, [{ creditor: "BDO" }, { creditor: "PNB" }]);
    assert.equal(dropped.length, 2);
  });

  it("tolerates a missing collection", () => {
    assert.deepEqual(pickWritableRows("ExistingLiability", undefined), []);
  });
});
