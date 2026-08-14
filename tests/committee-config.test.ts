import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  APPROVAL_TIERS,
  COMMITTEE_STAGE_ORDER,
  approvalStageLimit,
  committeeRoleLabel,
  stageKeyFromSlug,
  stageSlug,
  stagesForAmount
} from "../src/lib/committee-config";

describe("approvalStageLimit", () => {
  it("uses the low tier up to 30,000", () => {
    assert.equal(approvalStageLimit(0), 2);
    assert.equal(approvalStageLimit(30000), 2);
  });

  it("uses the mid tier just above 30,000 and up to 90,000", () => {
    assert.equal(approvalStageLimit(30000.01), 5);
    assert.equal(approvalStageLimit(90000), 5);
  });

  it("uses the high tier above 90,000 with no upper bound", () => {
    assert.equal(approvalStageLimit(90000.01), 8);
    assert.equal(approvalStageLimit(5_000_000), 8);
  });

  it("leaves no gap between the tiers", () => {
    // A value landing between two tiers would return 0 and silently route to nobody.
    for (const amount of [30000, 30000.005, 30000.01, 90000, 90000.005, 90000.01]) {
      assert.ok(approvalStageLimit(amount) > 0, `amount ${amount} fell through every tier`);
    }
  });

  it("covers the full range with tiers that do not overlap", () => {
    for (let i = 0; i < APPROVAL_TIERS.length - 1; i++) {
      const current = APPROVAL_TIERS[i];
      const next = APPROVAL_TIERS[i + 1];
      assert.ok(current.max !== null, "only the last tier may be open-ended");
      assert.ok(next.min > (current.max as number), "tiers must not overlap");
    }
    assert.equal(APPROVAL_TIERS[APPROVAL_TIERS.length - 1].max, null, "the last tier must be open-ended");
  });
});

describe("committeeRoleLabel", () => {
  it("resolves a configured role to its label", () => {
    assert.equal(committeeRoleLabel("BRANCH_TL"), "Branch Team Leader");
  });

  it("falls back to a readable form for an unknown role", () => {
    assert.equal(committeeRoleLabel("SOME_NEW_ROLE"), "SOME NEW ROLE");
  });
});

describe("approval chains", () => {
  it("routes a small loan through the bookkeeper then the branch team leader", () => {
    assert.deepEqual(stagesForAmount(25000), ["BRANCH_BOOKKEEPER", "BRANCH_TL"]);
  });

  it("ends a mid-tier loan at the Head Office Team Leader, with Remedial just before", () => {
    const stages = stagesForAmount(60000);
    assert.deepEqual(stages, ["BRANCH_BOOKKEEPER", "BRANCH_TL", "AREA_TL", "REMEDIAL", "HEAD_OFFICE_TL"]);
    assert.equal(stages[stages.length - 1], "HEAD_OFFICE_TL", "Head Office TL is the final approver below 90k");
    assert.equal(stages[stages.length - 2], "REMEDIAL", "Remedial comes immediately before Head Office TL");
  });

  it("sends a large loan through every committee, ending at the Finance Manager", () => {
    const stages = stagesForAmount(150000);
    assert.deepEqual(stages, [...COMMITTEE_STAGE_ORDER], "above 90k every committee must approve");
    assert.equal(stages[stages.length - 1], "FINANCE_MANAGER");
    assert.deepEqual(stages.slice(-3), ["ACCOUNTING", "CMG", "FINANCE_MANAGER"], "Accounting and CMG come before the Finance Manager");
  });

  it("keeps every stage in the same relative order across all tiers", () => {
    for (const tier of APPROVAL_TIERS) {
      const positions = tier.roles.map((role) => COMMITTEE_STAGE_ORDER.indexOf(role as never));
      const sorted = [...positions].sort((a, b) => a - b);
      assert.deepEqual(positions, sorted, `${tier.key} lists its stages out of order`);
    }
  });
});

describe("stage slugs", () => {
  it("round-trips every stage key through its URL slug", () => {
    for (const key of COMMITTEE_STAGE_ORDER) {
      assert.equal(stageKeyFromSlug(stageSlug(key)), key);
    }
  });

  it("rejects a slug that is not a committee stage", () => {
    assert.equal(stageKeyFromSlug("not-a-committee"), null);
  });
});
