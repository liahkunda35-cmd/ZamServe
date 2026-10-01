import type { ServiceItem } from "@/lib/types";

export function ServiceChoices({ services }: { services: ServiceItem[] }) {
  const barbershop = services.filter((service) => service.section === "barbershop");
  const salon = services.filter((service) => service.section === "salon");
  const other = services.filter((service) => service.section !== "barbershop" && service.section !== "salon");
  return (
    <>
      {barbershop.length > 0 && (
        <optgroup label="Barbershop">
          {barbershop.map((service) => (
            <option key={service.id} value={service.id}>{service.name}</option>
          ))}
        </optgroup>
      )}
      {salon.length > 0 && (
        <optgroup label="Salon">
          {salon.map((service) => (
            <option key={service.id} value={service.id}>{service.name}</option>
          ))}
        </optgroup>
      )}
      {other.map((service) => (
        <option key={service.id} value={service.id}>{service.name}</option>
      ))}
    </>
  );
}
