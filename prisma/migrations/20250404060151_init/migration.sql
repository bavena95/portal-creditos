-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "offerAmount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "profession" TEXT NOT NULL,
    "maritalStatus" TEXT NOT NULL,
    "bank" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_analysis',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploaded_files" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "r2Key" TEXT NOT NULL,
    "originalFilename" TEXT,
    "mimetype" TEXT,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploaded_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "offers_caseNumber_key" ON "offers"("caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "uploaded_files_r2Key_key" ON "uploaded_files"("r2Key");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
