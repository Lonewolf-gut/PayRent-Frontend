"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { propertySchema, type PropertyInput } from "@/lib/validations/property";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getApiErrorMessage, readApiJson } from "@/lib/utils/api-message";
import { useSubscriptionUpgradePrompt } from "@/components/dashboard/use-subscription-upgrade-prompt";
import { ListingLimitsBanner } from "@/components/dashboard/ListingLimitsBanner";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { PropertyCategorySelect } from "@/components/dashboard/PropertyCategorySelect";
import { AgentSearchField } from "@/components/dashboard/AgentSearchField";
import { PropertyAmenityChips } from "@/components/properties/property-amenity-chips";
import { PropertyAttributeFields } from "@/components/properties/property-attribute-fields";
import { ListingPhotoUploadGrid } from "@/components/properties/listing-photo-upload-grid";
import {
  PropertyLocationFields,
  emptyPropertyLocation,
  type PropertyLocationForm,
} from "@/components/properties/property-location-fields";
import {
  emptyAttributesForType,
  getAmenitiesForType,
  parseAttributesJson,
  type PropertyAttributes,
} from "@/lib/constants/property-listing";
import {
  getCategoryForType,
  isSaleListing,
  PROPERTY_TYPE_LABELS,
  type PropertyCategory,
} from "@/lib/subscription-limits";
import type { PropertyType } from "@prisma/client";

type LandlordPropertyInput = PropertyInput & {
  googleMapUrl?: string;
};

function isListingEditLocked(status?: string) {
  return status === "ACTIVE" || status === "RENTED";
}

function listingStatusLabel(status: string) {
  if (status === "ACTIVE" || status === "RENTED") return "Approved";
  if (status === "INACTIVE") return "Not approved";
  return "Pending";
}

function listingStatusBadgeKey(status: string) {
  if (status === "ACTIVE" || status === "RENTED") return "ACTIVE";
  if (status === "INACTIVE") return "REJECTED";
  return "PENDING";
}

export default function LandlordPropertiesPage() {
  const { handleLimitError, upgradeDialog } = useSubscriptionUpgradePrompt();
  const [showForm, setShowForm] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [editImages, setEditImages] = useState<File[]>([]);
  const [mapUrl, setMapUrl] = useState("");
  const [editMapUrl, setEditMapUrl] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [editFileError, setEditFileError] = useState<string | null>(null);
  const [addCategory, setAddCategory] = useState<PropertyCategory>("residential");
  const [editCategory, setEditCategory] = useState<PropertyCategory>("residential");
  const [showAddMap, setShowAddMap] = useState(false);
  const [showEditMap, setShowEditMap] = useState(false);
  const [addAgentId, setAddAgentId] = useState<string | null>(null);
  const [addLocation, setAddLocation] = useState<PropertyLocationForm>(emptyPropertyLocation());
  const [editLocation, setEditLocation] = useState<PropertyLocationForm>(emptyPropertyLocation());
  const [addAmenities, setAddAmenities] = useState<string[]>([]);
  const [editAmenities, setEditAmenities] = useState<string[]>([]);
  const [addAttributes, setAddAttributes] = useState<PropertyAttributes>(
    emptyAttributesForType("APARTMENT")
  );
  const [editAttributes, setEditAttributes] = useState<PropertyAttributes>(
    emptyAttributesForType("APARTMENT")
  );
  const [addSurveyPlan, setAddSurveyPlan] = useState<File | null>(null);
  const [editSurveyPlan, setEditSurveyPlan] = useState<File | null>(null);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);

  const MAX_LISTING_PHOTOS = 10;

  const optionalNumberField = {
    setValueAs: (value: string) => {
      if (value === "" || value == null) return undefined;
      const num = Number(value);
      return Number.isFinite(num) && num > 0 ? num : undefined;
    },
  };

  const requiredNumberField = {
    setValueAs: (value: string) => {
      const num = Number(value);
      return Number.isFinite(num) ? num : undefined;
    },
  };

  const showFormErrors = (errors: typeof addErrors) => {
    const first = Object.values(errors)[0];
    const message =
      (first as { message?: string })?.message ??
      "Please complete all required fields correctly.";
    toast.error(message);
  };

  const queryClient = useQueryClient();

  const { data: landlordProperties, isLoading: isPropertiesLoading } = useQuery({
    queryKey: ["landlord-properties"],
    queryFn: async () => {
      const res = await fetch("/api/properties/landlord");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Unable to load properties");
      return json.data ?? [];
    },
  });

  const editForm = useForm<LandlordPropertyInput>({
    resolver: zodResolver(propertySchema) as Resolver<LandlordPropertyInput>,
    defaultValues: {
      propertyType: "APARTMENT",
      amenities: [],
    },
  });

  const { register: editRegister, handleSubmit: handleEditSubmit, setValue: setEditValue, watch: watchEdit, formState: { errors: editErrors } } = editForm;
  const { register: addRegister, handleSubmit: handleAddSubmit, setValue: setAddValue, watch: watchAdd, formState: { errors: addErrors } } = useForm<LandlordPropertyInput>({
    resolver: zodResolver(propertySchema) as Resolver<LandlordPropertyInput>,
    defaultValues: {
      propertyType: "APARTMENT",
      amenities: [],
    },
  });

  const addPropertyType = (watchAdd("propertyType") ?? "APARTMENT") as PropertyType;
  const editPropertyType = (watchEdit("propertyType") ?? "APARTMENT") as PropertyType;
  const googleMapQuery =
    mapUrl ||
    [addLocation.landmark, addLocation.area, addLocation.city, addLocation.region]
      .filter(Boolean)
      .join(", ");
  const editGoogleMapQuery =
    editMapUrl ||
    [editLocation.landmark, editLocation.area, editLocation.city, editLocation.region]
      .filter(Boolean)
      .join(", ");
  const isAddSale = isSaleListing(addPropertyType);
  const isEditSale = isSaleListing(editPropertyType);

  const appendPropertyFields = (
    formData: FormData,
    data: LandlordPropertyInput,
    isSale: boolean,
    location: PropertyLocationForm,
    amenities: string[],
    attributes: PropertyAttributes,
    surveyPlan?: File | null
  ) => {
    formData.append("name", data.name);
    formData.append("propertyType", data.propertyType);
    formData.append("monthlyRent", String(data.monthlyRent));
    if (!isSale) {
      formData.append("annualRent", String(data.annualRent));
      formData.append("region", location.region);
      formData.append("city", location.city);
      formData.append("area", location.area);
      formData.append("street", location.street);
      formData.append("houseNumber", location.houseNumber);
      formData.append("digitalAddress", location.digitalAddress);
      formData.append("landmark", location.landmark);
      if (data.location) formData.append("location", data.location);
      const latitude = location.latitude
        ? Number(location.latitude)
        : data.latitude;
      const longitude = location.longitude
        ? Number(location.longitude)
        : data.longitude;
      if (latitude !== undefined && Number.isFinite(latitude)) {
        formData.append("latitude", String(latitude));
      }
      if (longitude !== undefined && Number.isFinite(longitude)) {
        formData.append("longitude", String(longitude));
      }
    }
    if (isSale && data.discountedPrice != null && !Number.isNaN(data.discountedPrice)) {
      formData.append("discountedPrice", String(data.discountedPrice));
    }
    formData.append("description", data.description);
    if (data.stockQuantity != null) {
      formData.append("stockQuantity", String(data.stockQuantity));
    }
    if (data.deliveryTerms) formData.append("deliveryTerms", data.deliveryTerms);
    if (data.warrantyDetails) formData.append("warrantyDetails", data.warrantyDetails);
    if (data.availableFrom) formData.append("availableFrom", data.availableFrom);
    if (getAmenitiesForType(data.propertyType as PropertyType).length > 0) {
      formData.append("amenities", JSON.stringify(amenities));
    }
    formData.append("attributes", JSON.stringify(attributes));
    if (surveyPlan) formData.append("surveyPlan", surveyPlan);
  };

  useEffect(() => {
    setAddAttributes(emptyAttributesForType(addPropertyType));
    setAddAmenities([]);
    setAddSurveyPlan(null);
  }, [addPropertyType]);

  useEffect(() => {
    if (addLocation.latitude) {
      setAddValue("latitude", Number(addLocation.latitude));
    }
    if (addLocation.longitude) {
      setAddValue("longitude", Number(addLocation.longitude));
    }
  }, [addLocation.latitude, addLocation.longitude, setAddValue]);

  useEffect(() => {
    if (editLocation.latitude) {
      setEditValue("latitude", Number(editLocation.latitude));
    }
    if (editLocation.longitude) {
      setEditValue("longitude", Number(editLocation.longitude));
    }
  }, [editLocation.latitude, editLocation.longitude, setEditValue]);

  useEffect(() => {
    if (!mapUrl) {
      return;
    }

    const coords = /@(-?[0-9.]+),(-?[0-9.]+)/.exec(mapUrl);
    if (coords) {
      setAddValue("latitude", Number(coords[1]));
      setAddValue("longitude", Number(coords[2]));
      setAddLocation((current) => ({
        ...current,
        latitude: coords[1],
        longitude: coords[2],
      }));
    }
  }, [mapUrl, setAddValue]);

  useEffect(() => {
    if (!editMapUrl) {
      return;
    }

    const coords = /@(-?[0-9.]+),(-?[0-9.]+)/.exec(editMapUrl);
    if (coords) {
      setEditValue("latitude", Number(coords[1]));
      setEditValue("longitude", Number(coords[2]));
      setEditLocation((current) => ({
        ...current,
        latitude: coords[1],
        longitude: coords[2],
      }));
    }
  }, [editMapUrl, setEditValue]);

  const addImagePreviews = useMemo(
    () => images.map((file) => URL.createObjectURL(file)),
    [images]
  );

  const editImagePreviews = useMemo(
    () => editImages.map((file) => URL.createObjectURL(file)),
    [editImages]
  );

  useEffect(() => {
    return () => {
      addImagePreviews.forEach(URL.revokeObjectURL);
      editImagePreviews.forEach(URL.revokeObjectURL);
    };
  }, [addImagePreviews, editImagePreviews]);

  const countListingPhotos = useCallback(
    (existingCount: number, newCount: number) => existingCount + newCount,
    []
  );

  const appendPhotos = (
    incoming: File[],
    existingVisibleCount: number,
    currentFiles: File[],
    setFiles: (files: File[]) => void,
    setError: (message: string | null) => void
  ) => {
    const remaining = MAX_LISTING_PHOTOS - countListingPhotos(existingVisibleCount, currentFiles.length);
    if (remaining <= 0) {
      setError(`Maximum ${MAX_LISTING_PHOTOS} photos allowed.`);
      return;
    }
    const next = [...currentFiles, ...incoming.slice(0, remaining)];
    setFiles(next);
    setError(next.length >= MAX_LISTING_PHOTOS ? `Maximum ${MAX_LISTING_PHOTOS} photos allowed.` : null);
  };

  const appendAddPhotos = (incoming: File[]) =>
    appendPhotos(incoming, 0, images, setImages, setFileError);

  const createProperty = useMutation({
    mutationFn: async (data: LandlordPropertyInput) => {
      const formData = new FormData();
      const isSale = isSaleListing(data.propertyType as PropertyType);
      appendPropertyFields(
        formData,
        data,
        isSale,
        addLocation,
        addAmenities,
        addAttributes,
        addSurveyPlan
      );
      if (!isSale && mapUrl) {
        formData.append("googleMapUrl", mapUrl);
      }
      images.slice(0, 10).forEach((file) => formData.append("images", file));
      if (addAgentId) formData.append("agentUserId", addAgentId);

      const res = await fetch("/api/properties", {
        method: "POST",
        body: formData,
      });

      const json = await readApiJson(res);
      if (!res.ok || !json.success) {
        throw new Error(
          getApiErrorMessage(json, "We couldn't submit your listing. Please check the form and try again.")
        );
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landlord-properties"] });
      queryClient.invalidateQueries({ queryKey: ["listing-limits"] });
      toast.success("Listing submitted for approval");
      setShowForm(false);
      setImages([]);
      setMapUrl("");
      setAddAgentId(null);
      setAddLocation(emptyPropertyLocation());
      setAddAmenities([]);
      setAddAttributes(emptyAttributesForType("APARTMENT"));
      setAddSurveyPlan(null);
    },
    onError: (error: Error) => {
      const message = error?.message ?? "Failed to create property";
      if (!handleLimitError(message)) {
        toast.error(message);
      }
    },
  });

  const updateProperty = useMutation({
    mutationFn: async (data: LandlordPropertyInput & { id: string }) => {
      const formData = new FormData();
      const isSale = isSaleListing(data.propertyType as PropertyType);
      appendPropertyFields(
        formData,
        data,
        isSale,
        editLocation,
        editAmenities,
        editAttributes,
        editSurveyPlan
      );
      if (!isSale && editMapUrl) {
        formData.append("googleMapUrl", editMapUrl);
      }
      editImages.slice(0, MAX_LISTING_PHOTOS).forEach((file) => formData.append("images", file));
      if (removedImageIds.length) {
        formData.append("removeImageIds", JSON.stringify(removedImageIds));
      }

      const res = await fetch(`/api/properties/${data.id}`, {
        method: "PATCH",
        body: formData,
      });
      const json = await readApiJson(res);
      if (!res.ok || !json.success) {
        throw new Error(
          getApiErrorMessage(json, "We couldn't update your listing. Please check the form and try again.")
        );
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landlord-properties"] });
      toast.success("Property listing updated");
      setEditingPropertyId(null);
      setEditImages([]);
      setRemovedImageIds([]);
      setEditMapUrl("");
      setEditLocation(emptyPropertyLocation());
      setEditAmenities([]);
      setEditAttributes(emptyAttributesForType("APARTMENT"));
      setEditSurveyPlan(null);
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? "Failed to update property");
    },
  });

  const deleteProperty = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/properties/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Failed to delete property");
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landlord-properties"] });
      toast.success("Property listing removed");
    },
    onError: (error: any) => {
      toast.error(error?.message ?? "Failed to delete property");
    },
  });

  const onSubmit = async (data: LandlordPropertyInput) => {
    await createProperty.mutateAsync(data);
  };

  const onEditSubmit = async (data: LandlordPropertyInput) => {
    if (!editingPropertyId) return;
    await updateProperty.mutateAsync({ ...data, id: editingPropertyId });
  };

  const editingProperty = landlordProperties?.find((property: any) => property.id === editingPropertyId);

  const appendEditPhotos = (incoming: File[]) => {
    const existingVisibleCount =
      (editingProperty?.images?.length ?? 0) - removedImageIds.length;
    appendPhotos(incoming, existingVisibleCount, editImages, setEditImages, setEditFileError);
  };

  const replaceExistingPhoto = (imageId: string, file: File) => {
    setRemovedImageIds((current) => (current.includes(imageId) ? current : [...current, imageId]));
    appendEditPhotos([file]);
  };

  const replaceNewPhoto = (index: number, file: File) => {
    setEditImages((current) => current.map((item, itemIndex) => (itemIndex === index ? file : item)));
  };

  const replaceAddPhoto = (index: number, file: File) => {
    setImages((current) => current.map((item, itemIndex) => (itemIndex === index ? file : item)));
  };

  const removeAddPhoto = (index: number) => {
    setImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setFileError(null);
  };

  const removeEditNewPhoto = (index: number) => {
    setEditImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setEditFileError(null);
  };

  const removeExistingPhoto = (imageId: string) => {
    setRemovedImageIds((current) => (current.includes(imageId) ? current : [...current, imageId]));
  };

  const beginEdit = (property: any) => {
    if (isListingEditLocked(property.status)) {
      toast.error("Approved listings cannot be edited. Contact support if you need changes.");
      return;
    }
    setEditingPropertyId(property.id);
    setShowForm(false);
    setEditImages([]);
    setRemovedImageIds([]);
    setEditMapUrl("");
    const propertyType = property.propertyType as PropertyType;
    setEditCategory(getCategoryForType(propertyType));
    setEditLocation({
      region: property.region ?? "",
      city: property.city ?? "",
      area: property.area ?? "",
      street: property.street ?? "",
      houseNumber: property.houseNumber ?? "",
      digitalAddress: property.digitalAddress ?? "",
      landmark: property.landmark ?? "",
      latitude: property.latitude != null ? String(property.latitude) : "",
      longitude: property.longitude != null ? String(property.longitude) : "",
    });
    setEditAmenities(property.amenities ?? []);
    setEditAttributes({
      ...emptyAttributesForType(propertyType),
      ...(parseAttributesJson(property.attributes) ?? {}),
    });
    setEditSurveyPlan(null);
    editForm.reset({
      name: property.name,
      propertyType: property.propertyType,
      monthlyRent: Number(property.monthlyRent),
      annualRent: Number(property.annualRent),
      discountedPrice: property.discountedPrice ? Number(property.discountedPrice) : undefined,
      location: isSaleListing(property.propertyType as PropertyType) ? undefined : property.location,
      latitude: property.latitude ?? undefined,
      longitude: property.longitude ?? undefined,
      description: property.description,
      stockQuantity: property.stockQuantity ?? 1,
      deliveryTerms: property.deliveryTerms ?? undefined,
      warrantyDetails: property.warrantyDetails ?? undefined,
      availableFrom: property.availableFrom ? new Date(property.availableFrom).toISOString().slice(0, 16) : undefined,
      amenities: property.amenities ?? [],
    });
  };

  const cancelEdit = () => {
    setEditingPropertyId(null);
    setEditImages([]);
    setRemovedImageIds([]);
    setEditMapUrl("");
    setEditLocation(emptyPropertyLocation());
    setEditAmenities([]);
    setEditAttributes(emptyAttributesForType("APARTMENT"));
    setEditSurveyPlan(null);
  };

  return (
    <div className="space-y-6">
      {upgradeDialog}
      <ListingLimitsBanner />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Properties</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            List as many products as you like. Approved listings appear on the marketplace only with
            a Pro or Max subscription.
          </p>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "Add listing"}
        </Button>
      </div>

      {isPropertiesLoading ? (
        <p className="text-muted-foreground">Loading your listings...</p>
      ) : landlordProperties?.length ? (
        <div className="space-y-3">
          {landlordProperties.map((property: any) => {
            const editLocked = isListingEditLocked(property.status);
            return (
              <div
                key={property.id}
                className="flex flex-col gap-2 rounded-xl bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <span className="font-medium text-foreground">{property.name}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {PROPERTY_TYPE_LABELS[property.propertyType as PropertyType] ??
                        property.propertyType}
                    </Badge>
                    <StatusBadge
                      status={listingStatusBadgeKey(property.status)}
                      label={listingStatusLabel(property.status)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={editLocked}
                    title={
                      editLocked
                        ? "Approved listings cannot be edited"
                        : "Edit listing"
                    }
                    onClick={() => beginEdit(property)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteProperty.mutate(property.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {editingPropertyId && editingProperty && (
        <Card>
          <CardHeader>
            <CardTitle>Edit listing</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEditSubmit(onEditSubmit, showFormErrors)} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Listing name</Label>
                <Input {...editRegister("name")} />
                {editErrors.name && <p className="text-xs text-destructive">{editErrors.name.message}</p>}
              </div>
              <PropertyCategorySelect
                category={editCategory}
                propertyType={editForm.watch("propertyType") as PropertyType}
                onCategoryChange={setEditCategory}
                onTypeChange={(type) => {
                  setEditValue("propertyType", type);
                  setEditAttributes(emptyAttributesForType(type));
                  setEditAmenities([]);
                  setEditSurveyPlan(null);
                }}
              />
              {!isEditSale && (
                <>
                  <div className="sm:col-span-2 space-y-2">
                    <Label>Location details</Label>
                    <PropertyLocationFields
                      value={editLocation}
                      onChange={setEditLocation}
                    />
                    {editErrors.location && (
                      <p className="text-xs text-destructive">{editErrors.location.message}</p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Google Maps place or URL</Label>
                    <Input
                      value={editMapUrl}
                      onChange={(event) => setEditMapUrl(event.target.value)}
                      placeholder="Paste a Google Maps URL or place name"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Optional: paste a Google Maps URL or description to help the admin verify the address.
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEditMap((current) => !current)}
                    >
                      {showEditMap ? "Hide map preview" : "Show map preview"}
                    </Button>
                    {showEditMap && (
                      <div className="mt-3 h-56 overflow-hidden rounded-xl border border-slate-200">
                        <iframe
                          title="Location preview"
                          src={`https://www.google.com/maps?q=${encodeURIComponent(
                            editGoogleMapQuery || "Accra, Ghana"
                          )}&output=embed`}
                          className="h-full w-full border-0"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Monthly rent (GHS)</Label>
                    <Input type="number" {...editRegister("monthlyRent", requiredNumberField)} />
                    {editErrors.monthlyRent && (
                      <p className="text-xs text-destructive">{editErrors.monthlyRent.message}</p>
                    )}
                  </div>
                  <div>
                    <Label>Annual rent (GHS)</Label>
                    <Input type="number" {...editRegister("annualRent", optionalNumberField)} />
                    {editErrors.annualRent && (
                      <p className="text-xs text-destructive">{editErrors.annualRent.message}</p>
                    )}
                  </div>
                </>
              )}
              {isEditSale && (
                <>
                  <div>
                    <Label>Price (GHS)</Label>
                    <Input type="number" {...editRegister("monthlyRent", requiredNumberField)} />
                    {editErrors.monthlyRent && (
                      <p className="text-xs text-destructive">{editErrors.monthlyRent.message}</p>
                    )}
                  </div>
                  <div>
                    <Label>Discounted price (GHS, optional)</Label>
                    <Input type="number" {...editRegister("discountedPrice", optionalNumberField)} />
                    {editErrors.discountedPrice && (
                      <p className="text-xs text-destructive">{editErrors.discountedPrice.message}</p>
                    )}
                  </div>
                </>
              )}
              <div className="sm:col-span-2 space-y-2">
                <Label>Listing details</Label>
                <PropertyAttributeFields
                  propertyType={editPropertyType}
                  attributes={editAttributes}
                  onChange={setEditAttributes}
                  surveyPlanFile={editSurveyPlan}
                  onSurveyPlanChange={setEditSurveyPlan}
                  existingSurveyPlanUrl={
                    typeof editAttributes.surveyPlanUrl === "string"
                      ? editAttributes.surveyPlanUrl
                      : null
                  }
                />
              </div>
              {getAmenitiesForType(editPropertyType).length > 0 ? (
                <div className="sm:col-span-2 space-y-2">
                  <Label>Amenities</Label>
                  <PropertyAmenityChips
                    propertyType={editPropertyType}
                    selected={editAmenities}
                    onChange={setEditAmenities}
                  />
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea rows={4} {...editRegister("description")} />
                {editErrors.description && (
                  <p className="text-xs text-destructive">{editErrors.description.message}</p>
                )}
              </div>
              <div>
                <Label>Stock quantity</Label>
                <Input type="number" min={0} {...editRegister("stockQuantity", { valueAsNumber: true })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Delivery terms</Label>
                <Textarea rows={3} {...editRegister("deliveryTerms")} />
              </div>
              <div className="sm:col-span-2">
                <Label>Warranty details</Label>
                <Textarea rows={3} {...editRegister("warrantyDetails")} />
              </div>
              <div className="sm:col-span-2">
                <Label>Photos</Label>
                <ListingPhotoUploadGrid
                  existingPhotos={editingProperty.images ?? []}
                  newFiles={editImages}
                  newPreviews={editImagePreviews}
                  removedExistingIds={removedImageIds}
                  onRemoveExisting={removeExistingPhoto}
                  onReplaceExisting={replaceExistingPhoto}
                  onAddFiles={appendEditPhotos}
                  onRemoveNewFile={removeEditNewPhoto}
                  onReplaceNewFile={replaceNewPhoto}
                  helperText="Upload up to 10 photos."
                  errorMessage={editFileError}
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-3">
                <Button type="submit" disabled={updateProperty.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                  {updateProperty.isPending ? "Updating listing…" : "Update listing"}
                </Button>
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New listing</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddSubmit(onSubmit, showFormErrors)} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Listing name</Label>
                <Input {...addRegister("name")} />
                {addErrors.name && <p className="text-xs text-destructive">{addErrors.name.message}</p>}
              </div>
              <PropertyCategorySelect
                category={addCategory}
                propertyType={(watchAdd("propertyType") ?? "APARTMENT") as PropertyType}
                onCategoryChange={setAddCategory}
                onTypeChange={(type) => {
                  setAddValue("propertyType", type);
                  setAddAttributes(emptyAttributesForType(type));
                  setAddAmenities([]);
                  setAddSurveyPlan(null);
                }}
              />
              {!isAddSale && (
                <>
                  <div className="sm:col-span-2 space-y-2">
                    <Label>Location details</Label>
                    <PropertyLocationFields value={addLocation} onChange={setAddLocation} />
                    {addErrors.location && (
                      <p className="text-xs text-destructive">{addErrors.location.message}</p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Google Maps place or URL</Label>
                    <Input
                      value={mapUrl}
                      onChange={(event) => setMapUrl(event.target.value)}
                      placeholder="Paste a Google Maps URL or place name"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Optional: paste a Google Maps URL or description to help the admin verify the address.
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddMap((current) => !current)}
                    >
                      {showAddMap ? "Hide map preview" : "Show map preview"}
                    </Button>
                    {showAddMap && (
                      <div className="mt-3 h-56 overflow-hidden rounded-xl border border-slate-200">
                        <iframe
                          title="Location preview"
                          src={`https://www.google.com/maps?q=${encodeURIComponent(
                            googleMapQuery || "Accra, Ghana"
                          )}&output=embed`}
                          className="h-full w-full border-0"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Monthly rent (GHS)</Label>
                    <Input type="number" {...addRegister("monthlyRent", requiredNumberField)} />
                    {addErrors.monthlyRent && (
                      <p className="text-xs text-destructive">{addErrors.monthlyRent.message}</p>
                    )}
                  </div>
                  <div>
                    <Label>Annual rent (GHS)</Label>
                    <Input type="number" {...addRegister("annualRent", optionalNumberField)} />
                    {addErrors.annualRent && (
                      <p className="text-xs text-destructive">{addErrors.annualRent.message}</p>
                    )}
                  </div>
                </>
              )}
              {isAddSale && (
                <>
                  <div>
                    <Label>Price (GHS)</Label>
                    <Input type="number" {...addRegister("monthlyRent", requiredNumberField)} />
                    {addErrors.monthlyRent && (
                      <p className="text-xs text-destructive">{addErrors.monthlyRent.message}</p>
                    )}
                  </div>
                  <div>
                    <Label>Discounted price (GHS, optional)</Label>
                    <Input type="number" {...addRegister("discountedPrice", optionalNumberField)} />
                    {addErrors.discountedPrice && (
                      <p className="text-xs text-destructive">{addErrors.discountedPrice.message}</p>
                    )}
                  </div>
                </>
              )}
              <div className="sm:col-span-2 space-y-2">
                <Label>Listing details</Label>
                <PropertyAttributeFields
                  propertyType={addPropertyType}
                  attributes={addAttributes}
                  onChange={setAddAttributes}
                  surveyPlanFile={addSurveyPlan}
                  onSurveyPlanChange={setAddSurveyPlan}
                />
              </div>
              {getAmenitiesForType(addPropertyType).length > 0 ? (
                <div className="sm:col-span-2 space-y-2">
                  <Label>Amenities</Label>
                  <PropertyAmenityChips
                    propertyType={addPropertyType}
                    selected={addAmenities}
                    onChange={setAddAmenities}
                  />
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea rows={4} {...addRegister("description")} />
                {addErrors.description && (
                  <p className="text-xs text-destructive">{addErrors.description.message}</p>
                )}
              </div>
              <div>
                <Label>Stock quantity</Label>
                <Input type="number" min={0} defaultValue={1} {...addRegister("stockQuantity", { valueAsNumber: true })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Delivery terms</Label>
                <Textarea rows={3} placeholder="Shipping, pickup, or delivery timeline" {...addRegister("deliveryTerms")} />
              </div>
              <div className="sm:col-span-2">
                <Label>Warranty details</Label>
                <Textarea rows={3} placeholder="Manufacturer warranty, returns, or service coverage" {...addRegister("warrantyDetails")} />
              </div>
              <div className="sm:col-span-2">
                <AgentSearchField value={addAgentId} onChange={(id) => setAddAgentId(id)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Photos</Label>
                <ListingPhotoUploadGrid
                  newFiles={images}
                  newPreviews={addImagePreviews}
                  onAddFiles={appendAddPhotos}
                  onRemoveNewFile={removeAddPhoto}
                  onReplaceNewFile={replaceAddPhoto}
                  helperText="Upload up to 10 photos."
                  errorMessage={fileError}
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  disabled={createProperty.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {createProperty.isPending ? "Submitting listing…" : "Submit listing"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
