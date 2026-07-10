// Compute fresh JobPosting dates at build / ISR-regeneration time so Google
// never sees a stale `datePosted`. Combined with `export const revalidate`
// on the page, this gives a rolling refresh without a cron job.

export interface JobDates {
  datePosted: string; // YYYY-MM-DD, today
  validThrough: string; // YYYY-MM-DD, today + 365 days
}

export function getJobDates(): JobDates {
  const today = new Date();
  const validThrough = new Date(today);
  validThrough.setDate(validThrough.getDate() + 365);
  return {
    datePosted: today.toISOString().slice(0, 10),
    validThrough: validThrough.toISOString().slice(0, 10),
  };
}
