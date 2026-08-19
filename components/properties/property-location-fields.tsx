"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatStructuredAddress } from "@/lib/utils/property-location";

export type PropertyLocationForm = {
  region: string;
  city: string;
  area: string;
  street: string;
  houseNumber: string;
  digitalAddress: string;
  landmark: string;
  latitude: string;
  longitude: string;
};

export const emptyPropertyLocation = (): PropertyLocationForm => ({
  region: "",
  city: "",
  area: "",
  street: "",
  houseNumber: "",
  digitalAddress: "",
  landmark: "",
  latitude: "",
  longitude: "",
});

type Props = {
  value: PropertyLocationForm;
  onChange: (value: PropertyLocationForm) => void;
  disabled?: boolean;
};

export function PropertyLocationFields({ value, onChange, disabled }: Props) {
  function set<K extends keyof PropertyLocationForm>(
    key: K,
    fieldValue: PropertyLocationForm[K]
  ) {
    onChange({ ...value, [key]: fieldValue });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Structured location helps Customers find your listing and appears on the property detail page.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="region">Region</Label>
          <Input
            id="region"
            value={value.region}
            disabled={disabled}
            placeholder="e.g. Greater Accra"
            onChange={(e) => set("region", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City / Municipality</Label>
          <Input
            id="city"
            value={value.city}
            disabled={disabled}
            placeholder="e.g. Accra"
            onChange={(e) => set("city", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="area">Area / Suburb</Label>
          <Input
            id="area"
            value={value.area}
            disabled={disabled}
            placeholder="e.g. East Legon"
            onChange={(e) => set("area", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="street">Street</Label>
          <Input
            id="street"
            value={value.street}
            disabled={disabled}
            placeholder="e.g. Liberation Road"
            onChange={(e) => set("street", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="houseNumber">House Number</Label>
          <Input
            id="houseNumber"
            value={value.houseNumber}
            disabled={disabled}
            placeholder="e.g. 12A"
            onChange={(e) => set("houseNumber", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="digitalAddress">Digital Address (Ghana Post GPS)</Label>
          <Input
            id="digitalAddress"
            value={value.digitalAddress}
            disabled={disabled}
            placeholder="e.g. GA-123-4567"
            onChange={(e) => set("digitalAddress", e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="landmark">Landmark</Label>
          <Input
            id="landmark"
            value={value.landmark}
            disabled={disabled}
            placeholder="e.g. Near Accra Mall"
            onChange={(e) => set("landmark", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export { formatStructuredAddress } from "@/lib/utils/property-location";
