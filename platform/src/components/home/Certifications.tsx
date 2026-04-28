"use client";

import { motion } from "framer-motion";

const certifications = [
  {
    title: "Google Partner",
    description: "Certified in Search, Display, and Analytics",
  },
  {
    title: "Meta Business Partner",
    description: "Advanced Facebook & Instagram Ads",
  },
  {
    title: "HubSpot Certified",
    description: "Inbound Marketing & CRM",
  },
  {
    title: "Clutch Top Agency 2025",
    description: "Recognized Leader in Digital Marketing",
  },
  {
    title: "10+ Years Experience",
    description: "Proven Track Record Since 2015",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const badgeVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export default function Certifications() {
  return (
    <section className="relative py-24 px-6 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 font-heading">
            Recognized. Certified. Proven.
          </h2>
          <p className="text-[#3A3A3A] text-lg max-w-2xl mx-auto">
            We don&apos;t just talk the talk. The platforms we master have certified
            us as experts. The industry recognizes what our clients already know.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="flex flex-wrap justify-center gap-6"
        >
          {certifications.map((cert) => (
            <motion.div
              key={cert.title}
              variants={badgeVariants}
              whileHover={{
                scale: 1.05,
              }}
              className="border border-slate-200 rounded-xl bg-white shadow-sm p-6 text-center w-[200px] cursor-default transition-all duration-300 hover:border-[#1F4D2C]"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#F4F4F1] flex items-center justify-center border border-teal-200">
                <span className="text-[#1F4D2C] text-2xl font-bold">
                  {cert.title.charAt(0)}
                </span>
              </div>
              <p className="text-slate-900 font-bold text-sm mb-2 font-cta">{cert.title}</p>
              <p className="text-[#3A3A3A] text-xs leading-relaxed">
                {cert.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
