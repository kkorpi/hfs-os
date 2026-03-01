export const SETTINGS_DEFAULTS = {
  id: "default",
  ownerName: "Kevin Korpi",
  companyName: "Hold Fast Studio",
  location: "Bend, Oregon",
  businessEmail: "kevin@holdfaststudio.com",
  logoUrl: "",
  ein: "",
  paymentMethodLabel: "Wire Transfer / ACH",
  bankName: "Chase",
  accountNumber: "686033815",
  routingNumber: "325070760",
  lateFeeRate: 1.5,
  paymentTermsDays: 15,
  invoicePrefix: "HFS",
  defaultTaxRate: 0,
  currency: "USD",
  invoiceEmailSubject: "Invoice {number} from {company}",
  reminderEmailSubject: "Reminder: Invoice {number} is overdue",
  emailSignature: "Thanks,\nKevin",
  defaultTaxDeductible: 1,
  revenueGoal: 0,
  selfEmploymentTaxRate: 15.3,
  estimatedIncomeTaxRate: 22,
  updatedAt: "",
};

export type Settings = {
  [K in keyof typeof SETTINGS_DEFAULTS]: (typeof SETTINGS_DEFAULTS)[K];
};
