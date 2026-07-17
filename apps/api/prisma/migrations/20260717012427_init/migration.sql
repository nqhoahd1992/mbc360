-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "oid" TEXT,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "departmentId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "projectLead" TEXT NOT NULL,
    "productGroup" TEXT NOT NULL,
    "brandCustomer" TEXT NOT NULL,
    "dateOpened" DATE NOT NULL,
    "targetLaunchDate" DATE NOT NULL,
    "productSku" TEXT NOT NULL,
    "ownerDepartment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_markets" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "market" TEXT NOT NULL,

    CONSTRAINT "project_markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gate_records" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "gateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Not Started',
    "decision" TEXT,
    "owner" TEXT,
    "dueDate" DATE,
    "evidenceLink" TEXT,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gate_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "next_actions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "gateId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "owner" TEXT,
    "dueDate" DATE,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "dateCompleted" DATE,
    "closedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "next_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phase_closures" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "phase" INTEGER NOT NULL,
    "evidenceSummary" TEXT,
    "nextAction" TEXT,
    "nextDueDate" DATE,
    "nextOwner" TEXT,

    CONSTRAINT "phase_closures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sign_offs" (
    "id" TEXT NOT NULL,
    "phaseClosureId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT,
    "initials" TEXT,
    "date" DATE,
    "decision" TEXT,
    "comments" TEXT,
    "signedByUserId" TEXT,
    "signedAt" TIMESTAMP(3),
    "invalidatedByEventId" TEXT,

    CONSTRAINT "sign_offs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "angle_rows" (
    "id" TEXT NOT NULL,
    "phaseClosureId" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "ynna" TEXT NOT NULL DEFAULT 'NA',
    "covered" BOOLEAN NOT NULL DEFAULT false,
    "date" DATE,
    "evidenceRef" TEXT,
    "internalLink" TEXT,
    "initials" TEXT,
    "comments" TEXT,

    CONSTRAINT "angle_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gate_checks" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "gate" TEXT NOT NULL,
    "check" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "ynna" TEXT NOT NULL DEFAULT 'NA',
    "date" DATE,
    "evidenceRef" TEXT,
    "methodRef" TEXT,
    "internalLink" TEXT,
    "initials" TEXT,
    "notes" TEXT,

    CONSTRAINT "gate_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "itemOrder" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "gate" TEXT NOT NULL,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "ownerFunction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NA',
    "evidenceLink" TEXT,
    "notes" TEXT,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_items" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "itemOrder" INTEGER NOT NULL,
    "gate" TEXT NOT NULL,
    "requirement" TEXT NOT NULL,
    "minimumRequirement" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Not Started',
    "evidenceLink" TEXT,
    "notes" TEXT,

    CONSTRAINT "requirement_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_approvals" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT,
    "department" TEXT,
    "date" DATE,
    "decision" TEXT,
    "comments" TEXT,

    CONSTRAINT "study_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backtrack_events" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "initiatedBy" TEXT,
    "reason" TEXT,
    "fromGateId" TEXT NOT NULL,
    "toGateId" TEXT NOT NULL,
    "reopenedGateIds" TEXT[],
    "previousGates" JSONB NOT NULL,
    "previousSignOffs" JSONB NOT NULL,

    CONSTRAINT "backtrack_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formula_versions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "previousVersionId" TEXT,
    "changeType" TEXT,
    "reason" TEXT,
    "initiatedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "formula_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bom_lines" (
    "id" TEXT NOT NULL,
    "formulaVersionId" TEXT NOT NULL,
    "line" INTEGER NOT NULL,
    "rmCode" TEXT NOT NULL,
    "inciName" TEXT NOT NULL,
    "casNo" TEXT,
    "functionRole" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "percentWw" DOUBLE PRECISION NOT NULL,
    "costPerKg" DOUBLE PRECISION NOT NULL,
    "evidenceLink" TEXT,
    "notes" TEXT,

    CONSTRAINT "bom_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packaging_bom_lines" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "line" INTEGER NOT NULL,
    "component" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "unitsPerFinishedUnit" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "wastagePercent" DOUBLE PRECISION NOT NULL,
    "leadTime" TEXT,
    "moq" TEXT,
    "evidenceLink" TEXT,
    "methodRef" TEXT,
    "notes" TEXT,
    "approval" TEXT,

    CONSTRAINT "packaging_bom_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "costing_inputs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "batchSizeKg" DOUBLE PRECISION NOT NULL,
    "fillSizeG" DOUBLE PRECISION NOT NULL,
    "targetUnits" INTEGER NOT NULL,
    "packagingCostPerUnit" DOUBLE PRECISION NOT NULL,
    "labourOverheadPerUnit" DOUBLE PRECISION NOT NULL,
    "freightOtherPerUnit" DOUBLE PRECISION NOT NULL,
    "targetSellPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "costing_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_tracks" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "formulaVersionId" TEXT,
    "pifStatus" TEXT NOT NULL DEFAULT 'Not Started',
    "regulatoryStatus" TEXT NOT NULL DEFAULT 'Not Started',
    "claimsApproval" TEXT NOT NULL DEFAULT 'Not Started',
    "launchApproval" TEXT NOT NULL DEFAULT 'Not Started',
    "regulatoryNotes" TEXT,
    "pifApprovedDate" DATE,
    "launchApprovedDate" DATE,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "register_rows" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "registerKey" TEXT NOT NULL,
    "rowOrder" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "register_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_items" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "required" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "primaryTemplate" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Not Started',
    "gate" TEXT NOT NULL,
    "evidenceLink" TEXT,
    "notes" TEXT,

    CONSTRAINT "evidence_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "driveItemId" TEXT,
    "url" TEXT NOT NULL,
    "fileName" TEXT,
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkedToType" TEXT,
    "linkedToId" TEXT,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_records" (
    "id" TEXT NOT NULL,
    "changeId" TEXT NOT NULL,
    "projectId" TEXT,
    "triggerId" TEXT,
    "trigger" TEXT NOT NULL,
    "productSku" TEXT NOT NULL,
    "affectedArea" TEXT NOT NULL,
    "oldVersion" TEXT,
    "riskLevel" TEXT NOT NULL,
    "requiredAction" TEXT,
    "evidenceLink" TEXT,
    "requiredSignOffs" TEXT,
    "communicationRequired" BOOLEAN NOT NULL DEFAULT false,
    "salesMarketingMessage" TEXT,
    "dueDate" DATE,
    "status" TEXT NOT NULL DEFAULT 'Not Started',
    "closureEvidence" TEXT,
    "closedDate" DATE,
    "owner" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "change_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capa_records" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Not Started',
    "owner" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "capa_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_entries" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "testerName" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "dept" TEXT NOT NULL,
    "dateTested" DATE NOT NULL,
    "texture" INTEGER NOT NULL,
    "fragrance" INTEGER NOT NULL,
    "overall" INTEGER NOT NULL,
    "tooOilySlippery" BOOLEAN NOT NULL DEFAULT false,
    "wouldRecommend" BOOLEAN NOT NULL DEFAULT false,
    "bestLiked" TEXT,
    "concerns" TEXT,

    CONSTRAINT "feedback_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "projectId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gate_requirements" (
    "id" TEXT NOT NULL,
    "gateId" TEXT NOT NULL,
    "requirementType" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "enforcement" TEXT NOT NULL DEFAULT 'hard',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "gate_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_triggers" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "safety_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_entries" (
    "id" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "casNumbers" TEXT[],
    "inciKeywords" TEXT[],
    "listType" TEXT NOT NULL,
    "market" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "watchlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cosmetri_raw_materials" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAtRemote" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cosmetri_raw_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cosmetri_formulas" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAtRemote" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cosmetri_formulas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cosmetri_compliance" (
    "id" TEXT NOT NULL,
    "formulaId" TEXT NOT NULL,
    "market" TEXT,
    "data" JSONB NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cosmetri_compliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cosmetri_sync_state" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "sinceUpdatedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,

    CONSTRAINT "cosmetri_sync_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_oid_key" ON "users"("oid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "permissions"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "projects_productCode_key" ON "projects"("productCode");

-- CreateIndex
CREATE UNIQUE INDEX "project_markets_projectId_market_key" ON "project_markets"("projectId", "market");

-- CreateIndex
CREATE UNIQUE INDEX "gate_records_projectId_gateId_key" ON "gate_records"("projectId", "gateId");

-- CreateIndex
CREATE INDEX "next_actions_projectId_gateId_idx" ON "next_actions"("projectId", "gateId");

-- CreateIndex
CREATE UNIQUE INDEX "phase_closures_projectId_phase_key" ON "phase_closures"("projectId", "phase");

-- CreateIndex
CREATE INDEX "sign_offs_phaseClosureId_idx" ON "sign_offs"("phaseClosureId");

-- CreateIndex
CREATE UNIQUE INDEX "angle_rows_phaseClosureId_angle_key" ON "angle_rows"("phaseClosureId", "angle");

-- CreateIndex
CREATE INDEX "gate_checks_projectId_gate_idx" ON "gate_checks"("projectId", "gate");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_items_projectId_sectionKey_itemOrder_key" ON "checklist_items"("projectId", "sectionKey", "itemOrder");

-- CreateIndex
CREATE UNIQUE INDEX "requirement_items_projectId_sectionKey_itemOrder_key" ON "requirement_items"("projectId", "sectionKey", "itemOrder");

-- CreateIndex
CREATE UNIQUE INDEX "study_approvals_projectId_role_key" ON "study_approvals"("projectId", "role");

-- CreateIndex
CREATE INDEX "backtrack_events_projectId_idx" ON "backtrack_events"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "formula_versions_projectId_version_key" ON "formula_versions"("projectId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "bom_lines_formulaVersionId_line_key" ON "bom_lines"("formulaVersionId", "line");

-- CreateIndex
CREATE UNIQUE INDEX "packaging_bom_lines_projectId_line_key" ON "packaging_bom_lines"("projectId", "line");

-- CreateIndex
CREATE UNIQUE INDEX "costing_inputs_projectId_key" ON "costing_inputs"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "market_tracks_projectId_market_key" ON "market_tracks"("projectId", "market");

-- CreateIndex
CREATE UNIQUE INDEX "register_rows_projectId_registerKey_rowOrder_key" ON "register_rows"("projectId", "registerKey", "rowOrder");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_items_projectId_area_key" ON "evidence_items"("projectId", "area");

-- CreateIndex
CREATE INDEX "attachments_projectId_idx" ON "attachments"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "change_records_changeId_key" ON "change_records"("changeId");

-- CreateIndex
CREATE UNIQUE INDEX "capa_records_code_key" ON "capa_records"("code");

-- CreateIndex
CREATE INDEX "audit_events_projectId_occurredAt_idx" ON "audit_events"("projectId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_events_entityType_entityId_idx" ON "audit_events"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "gate_requirements_gateId_idx" ON "gate_requirements"("gateId");

-- CreateIndex
CREATE UNIQUE INDEX "safety_triggers_keyword_key" ON "safety_triggers"("keyword");

-- CreateIndex
CREATE INDEX "watchlist_entries_listType_idx" ON "watchlist_entries"("listType");

-- CreateIndex
CREATE UNIQUE INDEX "cosmetri_compliance_formulaId_market_key" ON "cosmetri_compliance"("formulaId", "market");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_markets" ADD CONSTRAINT "project_markets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_records" ADD CONSTRAINT "gate_records_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "next_actions" ADD CONSTRAINT "next_actions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phase_closures" ADD CONSTRAINT "phase_closures_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_offs" ADD CONSTRAINT "sign_offs_phaseClosureId_fkey" FOREIGN KEY ("phaseClosureId") REFERENCES "phase_closures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_offs" ADD CONSTRAINT "sign_offs_signedByUserId_fkey" FOREIGN KEY ("signedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_offs" ADD CONSTRAINT "sign_offs_invalidatedByEventId_fkey" FOREIGN KEY ("invalidatedByEventId") REFERENCES "audit_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "angle_rows" ADD CONSTRAINT "angle_rows_phaseClosureId_fkey" FOREIGN KEY ("phaseClosureId") REFERENCES "phase_closures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_checks" ADD CONSTRAINT "gate_checks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_items" ADD CONSTRAINT "requirement_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_approvals" ADD CONSTRAINT "study_approvals_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backtrack_events" ADD CONSTRAINT "backtrack_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formula_versions" ADD CONSTRAINT "formula_versions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formula_versions" ADD CONSTRAINT "formula_versions_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "formula_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_lines" ADD CONSTRAINT "bom_lines_formulaVersionId_fkey" FOREIGN KEY ("formulaVersionId") REFERENCES "formula_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packaging_bom_lines" ADD CONSTRAINT "packaging_bom_lines_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costing_inputs" ADD CONSTRAINT "costing_inputs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_tracks" ADD CONSTRAINT "market_tracks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_tracks" ADD CONSTRAINT "market_tracks_formulaVersionId_fkey" FOREIGN KEY ("formulaVersionId") REFERENCES "formula_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "register_rows" ADD CONSTRAINT "register_rows_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "register_rows" ADD CONSTRAINT "register_rows_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_records" ADD CONSTRAINT "change_records_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_records" ADD CONSTRAINT "capa_records_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_entries" ADD CONSTRAINT "feedback_entries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cosmetri_compliance" ADD CONSTRAINT "cosmetri_compliance_formulaId_fkey" FOREIGN KEY ("formulaId") REFERENCES "cosmetri_formulas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
