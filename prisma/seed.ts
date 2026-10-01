import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const catalog = [
  {
    name: "Beauty & Cosmetics",
    slug: "beauty-cosmetics",
    icon: "sparkles",
    imageUrl: "/images/beauty.jpg",
    description: "Barbershop and salon services, kept as separate lists.",
    services: [
      { name: "Haircut", slug: "haircut", section: "barbershop" },
      { name: "Fade", slug: "fade", section: "barbershop" },
      { name: "Shave", slug: "shave", section: "barbershop" },
      { name: "Beard trimming", slug: "beard-trimming", section: "barbershop" },
      { name: "Braiding", slug: "braiding", section: "salon" },
      { name: "Braids", slug: "braids", section: "both" },
      { name: "Cornrows", slug: "cornrows", section: "both" },
      { name: "Hair extensions", slug: "hair-extensions", section: "salon" },
      { name: "Nails", slug: "nails", section: "salon" },
      { name: "Manicure", slug: "manicure", section: "salon" },
      { name: "Pedicure", slug: "pedicure", section: "salon" },
      { name: "Makeup", slug: "makeup", section: "salon" },
      { name: "Hair treatment", slug: "hair-treatment", section: "salon" },
      { name: "Hair styling", slug: "hair-styling", section: "salon" },
      { name: "Hair dye", slug: "hair-dye", section: "both" },
    ],
  },
  {
    name: "Handy Craft / Repair",
    slug: "repairs",
    icon: "wrench",
    imageUrl: "/images/repairs.jpg",
    description: "Phone, computer, appliance, electrical, and plumbing repairs.",
    services: [
      { name: "Phone repair", slug: "phone-repair" },
      { name: "Laptop repair", slug: "laptop-repair" },
      { name: "Computer repair", slug: "computer-repair" },
      { name: "Fridge repair", slug: "fridge-repair" },
      { name: "Air-conditioner repair", slug: "air-conditioner-repair" },
      { name: "Electrical repair", slug: "electrical-repair" },
      { name: "Appliance repair", slug: "appliance-repair" },
      { name: "Plumbing repair", slug: "plumbing-repair" },
      { name: "General maintenance", slug: "general-maintenance" },
    ],
  },
  {
    name: "Cleaning Services",
    slug: "cleaning",
    icon: "spray",
    imageUrl: "/images/cleaning.jpg",
    description: "Home, office, garden, laundry, and move-in cleaning.",
    services: [
      { name: "Home cleaning", slug: "home-cleaning" },
      { name: "Office cleaning", slug: "office-cleaning" },
      { name: "Deep cleaning", slug: "deep-cleaning" },
      { name: "Garden care", slug: "garden-care" },
      { name: "Gardening", slug: "gardening" },
      { name: "Landscaping", slug: "landscaping" },
      { name: "Fumigation", slug: "fumigation" },
      { name: "Laundry", slug: "laundry" },
      { name: "Move-in cleaning", slug: "move-in-cleaning" },
      { name: "Move-out cleaning", slug: "move-out-cleaning" },
    ],
  },
];

async function main() {
  await prisma.message.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.bookingStatusHistory.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.address.deleteMany();
  await prisma.providerService.deleteMany();
  await prisma.providerAvailability.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.service.deleteMany();
  await prisma.category.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.providerProfile.deleteMany();
  await prisma.user.deleteMany();

  for (const category of catalog) {
    await prisma.category.create({
      data: {
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        imageUrl: category.imageUrl,
        description: category.description,
        services: {
          create: category.services.map((service) => ({
            name: service.name,
            slug: service.slug,
            section: "section" in service ? service.section : null,
            description: `${service.name} in ${category.name}.`,
          })),
        },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
