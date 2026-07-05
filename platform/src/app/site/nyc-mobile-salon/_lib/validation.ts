export type LeadFormData = {
  name: string;
  email: string;
  phone: string;
  service: string;
  borough: string;
  date: string;
  message: string;
};

export type FormErrors = Partial<Record<keyof LeadFormData, string>>;

export function validateLeadForm(data: LeadFormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.name.trim()) {
    errors.name = "Name is required";
  }

  if (!data.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Please enter a valid email";
  }

  if (!data.phone.trim()) {
    errors.phone = "Phone number is required";
  } else if (!/^[\d\s()+-]{7,}$/.test(data.phone)) {
    errors.phone = "Please enter a valid phone number";
  }

  if (!data.service) {
    errors.service = "Please select a service";
  }

  if (!data.borough) {
    errors.borough = "Please select a borough";
  }

  if (!data.date) {
    errors.date = "Please select a preferred date";
  }

  return errors;
}
