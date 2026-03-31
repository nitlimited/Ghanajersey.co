import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  User, Building, Package, Factory, Truck, Shield, FileCheck, Camera,
  ChevronRight, ChevronLeft, Check, AlertCircle, Plus, X, Instagram, MessageCircle
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { Header, Footer } from "./LandingPage";
import { useAuth, API } from "../App";
import { toast } from "sonner";
import axios from "axios";

const VendorOnboarding = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [vendorStatus, setVendorStatus] = useState(null);

  const totalSteps = 9;

  // Form state for all steps
  const [formData, setFormData] = useState({
    // Step 1: Identity
    identity: {
      full_name: "",
      business_name: "",
      phone_number: "",
      email: user?.email || "",
      city_location: "",
      social_handles: [{ platform: "instagram", handle: "" }],
      years_in_business: ""
    },
    // Step 2: Business Legitimacy
    business: {
      sells_online_offline: "",
      selling_platforms: [],
      jerseys_per_month: ""
    },
    // Step 3: Inventory
    inventory: {
      keeps_stock: "",
      stock_quantity: "",
      stock_sizes: []
    },
    // Step 4: Production
    production: {
      weekly_capacity: "",
      production_time: ""
    },
    // Step 5: Delivery
    delivery: {
      delivery_methods: [],
      city_delivery_time: "",
      delivers_outside_city: false,
      delivers_outside_ghana: false,
      accra_delivery_time: "",
      central_western_delivery_time: "",
      eastern_volta_delivery_time: "",
      ashanti_bono_delivery_time: "",
      northern_upper_delivery_time: ""
    },
    // Step 6: Quality
    quality: {
      jersey_source: "",
      materials: []
    },
    // Step 7: Commitment
    commitment: {
      fulfill_on_time: false,
      fulfill_through_platform: false,
      agree_terms: false
    },
    // Step 8: Verification
    verification: {
      jersey_photos: ["", ""],
      packaging_photo: ""
    }
  });

  useEffect(() => {
    checkVendorStatus();
  }, [token]);

  const checkVendorStatus = async () => {
    if (!token) return;
    
    try {
      const res = await axios.get(`${API}/vendor/onboarding-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVendorStatus(res.data.vendor_status);
      
      if (res.data.vendor_status === "approved") {
        navigate("/vendor");
      }
    } catch (error) {
      console.error("Error checking vendor status:", error);
    }
  };

  const updateFormData = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleDeleteUploadedImage = async (path, onSuccess, toastId) => {
    if (!path) {
      onSuccess();
      return;
    }

    try {
      toast.loading("Removing image...", { id: toastId });
      await axios.delete(`${API}/upload/file`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { path }
      });
      onSuccess();
      toast.success("Image removed", { id: toastId });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to remove image", { id: toastId });
    }
  };

  const addSocialHandle = () => {
    setFormData(prev => ({
      ...prev,
      identity: {
        ...prev.identity,
        social_handles: [...prev.identity.social_handles, { platform: "instagram", handle: "" }]
      }
    }));
  };

  const removeSocialHandle = (index) => {
    setFormData(prev => ({
      ...prev,
      identity: {
        ...prev.identity,
        social_handles: prev.identity.social_handles.filter((_, i) => i !== index)
      }
    }));
  };

  const updateSocialHandle = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      identity: {
        ...prev.identity,
        social_handles: prev.identity.social_handles.map((h, i) => 
          i === index ? { ...h, [field]: value } : h
        )
      }
    }));
  };

  const toggleArrayItem = (section, field, item) => {
    setFormData(prev => {
      const currentArray = prev[section][field];
      const newArray = currentArray.includes(item)
        ? currentArray.filter(i => i !== item)
        : [...currentArray, item];
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: newArray
        }
      };
    });
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.identity.full_name || !formData.identity.business_name || 
            !formData.identity.phone_number || !formData.identity.city_location ||
            !formData.identity.years_in_business) {
          toast.error("Please fill in all required fields");
          return false;
        }
        break;
      case 2:
        if (!formData.business.sells_online_offline || !formData.business.jerseys_per_month ||
            formData.business.selling_platforms.length === 0) {
          toast.error("Please fill in all required fields");
          return false;
        }
        break;
      case 3:
        if (!formData.inventory.keeps_stock || !formData.inventory.stock_quantity ||
            formData.inventory.stock_sizes.length === 0) {
          toast.error("Please fill in all required fields");
          return false;
        }
        break;
      case 4:
        if (!formData.production.weekly_capacity || !formData.production.production_time) {
          toast.error("Please fill in all required fields");
          return false;
        }
        break;
      case 5:
        if (formData.delivery.delivery_methods.length === 0 || !formData.delivery.city_delivery_time) {
          toast.error("Please fill in all required fields");
          return false;
        }
        break;
      case 6:
        if (!formData.quality.jersey_source || formData.quality.materials.length === 0) {
          toast.error("Please fill in all required fields");
          return false;
        }
        break;
      case 7:
        if (!formData.commitment.fulfill_on_time || !formData.commitment.fulfill_through_platform) {
          toast.error("Please confirm all commitments");
          return false;
        }
        break;
      case 8:
        if (!formData.commitment.agree_terms) {
          toast.error("Please agree to the terms and conditions");
          return false;
        }
        break;
      case 9:
        const validPhotos = formData.verification.jersey_photos.filter(p => p.trim() !== "");
        if (validPhotos.length < 2) {
          toast.error("Please upload at least 2 jersey photos");
          return false;
        }
        break;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const submitOnboarding = async () => {
    if (!validateStep()) return;
    
    setLoading(true);
    try {
      await axios.post(`${API}/vendor/onboarding`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Application submitted! You will be notified once approved.");
      setVendorStatus("pending_approval");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, title: "Identity", icon: User },
    { num: 2, title: "Business", icon: Building },
    { num: 3, title: "Inventory", icon: Package },
    { num: 4, title: "Production", icon: Factory },
    { num: 5, title: "Delivery", icon: Truck },
    { num: 6, title: "Quality", icon: Shield },
    { num: 7, title: "Commitment", icon: FileCheck },
    { num: 8, title: "Agreement", icon: FileCheck },
    { num: 9, title: "Verification", icon: Camera }
  ];

  // Show pending approval screen
  if (vendorStatus === "pending_approval") {
    return (
      <div className="min-h-screen bg-bone-white">
        <Header forceLight={true} stickyAnnouncement={true} />
        <div className="pt-12 pb-24 px-6 md:px-12 max-w-2xl mx-auto text-center">
          <div className="bg-ashanti-gold/10 border border-ashanti-gold/30 p-8 mt-12">
            <AlertCircle size={48} className="mx-auto text-ashanti-gold mb-4" />
            <h1 className="font-heading text-2xl mb-4">Application Under Review</h1>
            <p className="font-body text-muted-text mb-6">
              Thank you for submitting your vendor application. Our team is reviewing your information and will notify you via email once approved.
            </p>
            <p className="font-body text-sm text-muted-text">
              This usually takes 1-2 business days.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Show rejected screen
  if (vendorStatus === "rejected") {
    return (
      <div className="min-h-screen bg-bone-white">
        <Header forceLight={true} stickyAnnouncement={true} />
        <div className="pt-12 pb-24 px-6 md:px-12 max-w-2xl mx-auto text-center">
          <div className="bg-ghana-red/10 border border-ghana-red/30 p-8 mt-12">
            <AlertCircle size={48} className="mx-auto text-ghana-red mb-4" />
            <h1 className="font-heading text-2xl mb-4">Application Not Approved</h1>
            <p className="font-body text-muted-text mb-6">
              Unfortunately, your vendor application was not approved at this time. Please contact support for more information.
            </p>
            <Button className="bg-black hover:bg-ashanti-gold hover:text-black">
              Contact Support
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bone-white" data-testid="vendor-onboarding">
      <Header forceLight={true} stickyAnnouncement={true} />

      <div className="pt-8 pb-24 px-4 md:px-12 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl md:text-3xl tracking-widest uppercase mb-2">
            Become a Vendor
          </h1>
          <p className="font-body text-muted-text">Complete your store profile to start selling</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 overflow-x-auto pb-4">
          <div className="flex justify-between min-w-[600px] md:min-w-0">
            {steps.map((step, index) => (
              <div key={step.num} className="flex items-center">
                <div className={`flex flex-col items-center ${currentStep >= step.num ? 'text-black' : 'text-muted-text'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
                    currentStep > step.num ? 'bg-ghana-green text-white' : 
                    currentStep === step.num ? 'bg-ashanti-gold text-black' : 'bg-gray-200'
                  }`}>
                    {currentStep > step.num ? <Check size={16} /> : <step.icon size={16} />}
                  </div>
                  <span className="text-[10px] font-body uppercase tracking-wider hidden md:block">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 md:w-12 h-[2px] mx-1 ${currentStep > step.num ? 'bg-ghana-green' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white border border-black/10 p-6 md:p-8">
          {/* Step 1: Vendor Identity */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="font-heading text-xl mb-6">Vendor Identity</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="font-body text-sm uppercase tracking-wider">Full Name *</Label>
                  <Input
                    value={formData.identity.full_name}
                    onChange={(e) => updateFormData('identity', 'full_name', e.target.value)}
                    placeholder="Kwame Mensah"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="font-body text-sm uppercase tracking-wider">Business/Brand Name *</Label>
                  <Input
                    value={formData.identity.business_name}
                    onChange={(e) => updateFormData('identity', 'business_name', e.target.value)}
                    placeholder="Accra Jerseys"
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="font-body text-sm uppercase tracking-wider">Phone Number *</Label>
                  <Input
                    value={formData.identity.phone_number}
                    onChange={(e) => updateFormData('identity', 'phone_number', e.target.value)}
                    placeholder="+233 XX XXX XXXX"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="font-body text-sm uppercase tracking-wider">Email Address</Label>
                  <Input
                    value={formData.identity.email}
                    onChange={(e) => updateFormData('identity', 'email', e.target.value)}
                    placeholder="email@example.com"
                    className="mt-2"
                    disabled
                  />
                </div>
              </div>

              <div>
                <Label className="font-body text-sm uppercase tracking-wider">City/Location *</Label>
                <Input
                  value={formData.identity.city_location}
                  onChange={(e) => updateFormData('identity', 'city_location', e.target.value)}
                  placeholder="Accra, Ghana"
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="font-body text-sm uppercase tracking-wider mb-3 block">Social Media Handles</Label>
                {formData.identity.social_handles.map((handle, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Select
                      value={handle.platform}
                      onValueChange={(value) => updateSocialHandle(index, 'platform', value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="twitter">Twitter/X</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={handle.handle}
                      onChange={(e) => updateSocialHandle(index, 'handle', e.target.value)}
                      placeholder="@username"
                      className="flex-1"
                    />
                    {formData.identity.social_handles.length > 1 && (
                      <Button variant="outline" size="icon" onClick={() => removeSocialHandle(index)}>
                        <X size={16} />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addSocialHandle} className="mt-2">
                  <Plus size={14} className="mr-1" /> Add Another
                </Button>
              </div>

              <div>
                <Label className="font-body text-sm uppercase tracking-wider">How long have you been in clothing business? *</Label>
                <Select
                  value={formData.identity.years_in_business}
                  onValueChange={(value) => updateFormData('identity', 'years_in_business', value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="less_than_6_months">Less than 6 months</SelectItem>
                    <SelectItem value="6_months_to_1_year">6 months - 1 year</SelectItem>
                    <SelectItem value="1_to_3_years">1 - 3 years</SelectItem>
                    <SelectItem value="3_plus_years">3+ years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 2: Business Legitimacy */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="font-heading text-xl mb-6">Business Legitimacy</h2>

              <div>
                <Label className="font-body text-sm uppercase tracking-wider">Do you currently sell jerseys online or offline? *</Label>
                <Select
                  value={formData.business.sells_online_offline}
                  onValueChange={(value) => updateFormData('business', 'sells_online_offline', value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online only</SelectItem>
                    <SelectItem value="offline">Offline only</SelectItem>
                    <SelectItem value="both">Both online and offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="font-body text-sm uppercase tracking-wider mb-3 block">Where do you currently sell your jerseys? *</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {["instagram", "whatsapp", "physical_shop", "tiktok", "other_website", "multiple"].map((platform) => (
                    <div 
                      key={platform}
                      onClick={() => toggleArrayItem('business', 'selling_platforms', platform)}
                      className={`p-3 border cursor-pointer transition-all ${
                        formData.business.selling_platforms.includes(platform) 
                          ? 'border-ashanti-gold bg-ashanti-gold/10' 
                          : 'border-black/10 hover:border-black/30'
                      }`}
                    >
                      <span className="font-body text-sm capitalize">{platform.replace("_", " ")}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="font-body text-sm uppercase tracking-wider">Approximately how many jerseys do you sell per month? *</Label>
                <Select
                  value={formData.business.jerseys_per_month}
                  onValueChange={(value) => updateFormData('business', 'jerseys_per_month', value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1_10">1 - 10</SelectItem>
                    <SelectItem value="10_30">10 - 30</SelectItem>
                    <SelectItem value="30_100">30 - 100</SelectItem>
                    <SelectItem value="100_plus">100+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3: Inventory */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="font-heading text-xl mb-6">Inventory</h2>

              <div>
                <Label className="font-body text-sm uppercase tracking-wider">Do you keep jerseys in stock? *</Label>
                <Select
                  value={formData.inventory.keeps_stock}
                  onValueChange={(value) => updateFormData('inventory', 'keeps_stock', value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes_ready_to_ship">Yes - ready to ship</SelectItem>
                    <SelectItem value="no_made_after_order">No - made after order</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="font-body text-sm uppercase tracking-wider">On average, how many jerseys do you keep in stock? *</Label>
                <Select
                  value={formData.inventory.stock_quantity}
                  onValueChange={(value) => updateFormData('inventory', 'stock_quantity', value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1_20">1 - 20</SelectItem>
                    <SelectItem value="20_50">20 - 50</SelectItem>
                    <SelectItem value="50_100">50 - 100</SelectItem>
                    <SelectItem value="100_plus">100+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="font-body text-sm uppercase tracking-wider mb-3 block">What jersey sizes do you normally stock? *</Label>
                <div className="flex flex-wrap gap-3">
                  {["XS", "S", "M", "L", "XL", "XXL", "3XL"].map((size) => (
                    <div 
                      key={size}
                      onClick={() => toggleArrayItem('inventory', 'stock_sizes', size)}
                      className={`w-14 h-14 flex items-center justify-center border cursor-pointer transition-all ${
                        formData.inventory.stock_sizes.includes(size) 
                          ? 'border-ashanti-gold bg-ashanti-gold text-black' 
                          : 'border-black/10 hover:border-black/30'
                      }`}
                    >
                      <span className="font-body text-sm font-semibold">{size}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Production Capacity */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="font-heading text-xl mb-6">Production Capacity</h2>

              <div>
                <Label className="font-body text-sm uppercase tracking-wider">If you receive many orders, how many jerseys can you produce weekly? *</Label>
                <Select
                  value={formData.production.weekly_capacity}
                  onValueChange={(value) => updateFormData('production', 'weekly_capacity', value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5_10">5 - 10</SelectItem>
                    <SelectItem value="10_30">10 - 30</SelectItem>
                    <SelectItem value="30_100">30 - 100</SelectItem>
                    <SelectItem value="100_plus">100+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="font-body text-sm uppercase tracking-wider">What is your average production time for one jersey? *</Label>
                <Select
                  value={formData.production.production_time}
                  onValueChange={(value) => updateFormData('production', 'production_time', value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="same_day">Same day</SelectItem>
                    <SelectItem value="1_2_days">1 - 2 days</SelectItem>
                    <SelectItem value="3_5_days">3 - 5 days</SelectItem>
                    <SelectItem value="1_week_plus">1 week+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 5: Delivery Capability */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="font-heading text-xl mb-6">Delivery Capability</h2>

              <div>
                <Label className="font-body text-sm uppercase tracking-wider mb-3 block">How do you usually deliver jerseys to customers? *</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {["bolt", "courier", "ghana_post", "pickup", "multiple"].map((method) => (
                    <div 
                      key={method}
                      onClick={() => toggleArrayItem('delivery', 'delivery_methods', method)}
                      className={`p-3 border cursor-pointer transition-all ${
                        formData.delivery.delivery_methods.includes(method) 
                          ? 'border-ashanti-gold bg-ashanti-gold/10' 
                          : 'border-black/10 hover:border-black/30'
                      }`}
                    >
                      <span className="font-body text-sm capitalize">{method.replace("_", " ")}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="font-body text-sm uppercase tracking-wider">What is your average delivery time within your city? *</Label>
                <Select
                  value={formData.delivery.city_delivery_time}
                  onValueChange={(value) => updateFormData('delivery', 'city_delivery_time', value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="same_day">Same day</SelectItem>
                    <SelectItem value="1_2_days">1 - 2 days</SelectItem>
                    <SelectItem value="2_4_days">2 - 4 days</SelectItem>
                    <SelectItem value="5_plus_days">5+ days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  checked={formData.delivery.delivers_outside_city}
                  onCheckedChange={(checked) => updateFormData('delivery', 'delivers_outside_city', checked)}
                />
                <Label className="font-body text-sm">Do you deliver outside your city?</Label>
              </div>

              {formData.delivery.delivers_outside_city && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-bone-white">
                    <div>
                      <Label className="font-body text-xs uppercase tracking-wider text-muted-text">Accra delivery time</Label>
                      <Select
                        value={formData.delivery.accra_delivery_time}
                        onValueChange={(value) => updateFormData('delivery', 'accra_delivery_time', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="same_day">Same day</SelectItem>
                          <SelectItem value="1_2_days">1 - 2 days</SelectItem>
                          <SelectItem value="2_4_days">2 - 4 days</SelectItem>
                          <SelectItem value="5_plus_days">5+ days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="font-body text-xs uppercase tracking-wider text-muted-text">Central & Western Region</Label>
                      <Select
                        value={formData.delivery.central_western_delivery_time}
                        onValueChange={(value) => updateFormData('delivery', 'central_western_delivery_time', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="same_day">Same day</SelectItem>
                          <SelectItem value="1_2_days">1 - 2 days</SelectItem>
                          <SelectItem value="2_4_days">2 - 4 days</SelectItem>
                          <SelectItem value="5_plus_days">5+ days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="font-body text-xs uppercase tracking-wider text-muted-text">Eastern & Volta Region</Label>
                      <Select
                        value={formData.delivery.eastern_volta_delivery_time}
                        onValueChange={(value) => updateFormData('delivery', 'eastern_volta_delivery_time', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="same_day">Same day</SelectItem>
                          <SelectItem value="1_2_days">1 - 2 days</SelectItem>
                          <SelectItem value="2_4_days">2 - 4 days</SelectItem>
                          <SelectItem value="5_plus_days">5+ days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="font-body text-xs uppercase tracking-wider text-muted-text">Ashanti & Bono Region</Label>
                      <Select
                        value={formData.delivery.ashanti_bono_delivery_time}
                        onValueChange={(value) => updateFormData('delivery', 'ashanti_bono_delivery_time', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="same_day">Same day</SelectItem>
                          <SelectItem value="1_2_days">1 - 2 days</SelectItem>
                          <SelectItem value="2_4_days">2 - 4 days</SelectItem>
                          <SelectItem value="5_plus_days">5+ days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="font-body text-xs uppercase tracking-wider text-muted-text">Northern & Upper Regions</Label>
                      <Select
                        value={formData.delivery.northern_upper_delivery_time}
                        onValueChange={(value) => updateFormData('delivery', 'northern_upper_delivery_time', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="same_day">Same day</SelectItem>
                          <SelectItem value="1_2_days">1 - 2 days</SelectItem>
                          <SelectItem value="2_4_days">2 - 4 days</SelectItem>
                          <SelectItem value="5_plus_days">5+ days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={formData.delivery.delivers_outside_ghana}
                      onCheckedChange={(checked) => updateFormData('delivery', 'delivers_outside_ghana', checked)}
                    />
                    <Label className="font-body text-sm">Do you deliver outside of Ghana?</Label>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 6: Quality & Product Authenticity */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <h2 className="font-heading text-xl mb-6">Quality & Product Authenticity</h2>

              <div>
                <Label className="font-body text-sm uppercase tracking-wider">Do you design your own jerseys or resell from suppliers? *</Label>
                <Select
                  value={formData.quality.jersey_source}
                  onValueChange={(value) => updateFormData('quality', 'jersey_source', value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="design_produce">I design and produce my jerseys</SelectItem>
                    <SelectItem value="source_suppliers">I source from suppliers</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="font-body text-sm uppercase tracking-wider mb-3 block">What materials are your jerseys made from? *</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {["polyester", "mesh_fabric", "breathable_performance", "cotton_blend", "recycled_materials"].map((material) => (
                    <div 
                      key={material}
                      onClick={() => toggleArrayItem('quality', 'materials', material)}
                      className={`p-3 border cursor-pointer transition-all ${
                        formData.quality.materials.includes(material) 
                          ? 'border-ashanti-gold bg-ashanti-gold/10' 
                          : 'border-black/10 hover:border-black/30'
                      }`}
                    >
                      <span className="font-body text-sm capitalize">{material.replace("_", " ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 7: Vendor Commitment */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <h2 className="font-heading text-xl mb-6">Vendor Commitment</h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 border border-black/10">
                  <Checkbox
                    checked={formData.commitment.fulfill_on_time}
                    onCheckedChange={(checked) => updateFormData('commitment', 'fulfill_on_time', checked)}
                    className="mt-1"
                  />
                  <div>
                    <Label className="font-body text-sm font-semibold">Fulfill Orders On Time *</Label>
                    <p className="font-body text-xs text-muted-text mt-1">
                      Are you willing to fulfill orders within the delivery times promised on the platform?
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 border border-black/10">
                  <Checkbox
                    checked={formData.commitment.fulfill_through_platform}
                    onCheckedChange={(checked) => updateFormData('commitment', 'fulfill_through_platform', checked)}
                    className="mt-1"
                  />
                  <div>
                    <Label className="font-body text-sm font-semibold">Platform Exclusivity *</Label>
                    <p className="font-body text-xs text-muted-text mt-1">
                      Do you agree that all orders received through GhanaJersey.co must be fulfilled through the platform?
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 8: Agreement */}
          {currentStep === 8 && (
            <div className="space-y-6">
              <h2 className="font-heading text-xl mb-6">Terms & Agreement</h2>

              <div className="bg-bone-white p-6 max-h-64 overflow-y-auto font-body text-sm space-y-4">
                <h3 className="font-semibold">Vendor Terms & Conditions</h3>
                <p>By registering as a vendor on GhanaJersey.co, you agree to:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Provide accurate product descriptions and images</li>
                  <li>Fulfill all orders within the promised delivery timeframes</li>
                  <li>Maintain quality standards for all products sold</li>
                  <li>Accept the 15% platform commission on all sales</li>
                  <li>Respond to customer inquiries within 24 hours</li>
                  <li>Process refunds and returns according to platform policy</li>
                  <li>Not contact customers directly to circumvent the platform</li>
                  <li>Provide valid identification and business documents upon request</li>
                </ul>
                <p className="text-muted-text">Full terms available at <a href="/terms" className="text-ashanti-gold underline">Terms & Conditions</a></p>
              </div>

              <div className="flex items-start gap-3 p-4 border border-ashanti-gold/30 bg-ashanti-gold/5">
                <Checkbox
                  checked={formData.commitment.agree_terms}
                  onCheckedChange={(checked) => updateFormData('commitment', 'agree_terms', checked)}
                  className="mt-1"
                />
                <div>
                  <Label className="font-body text-sm font-semibold">I Agree to Terms & Conditions *</Label>
                  <p className="font-body text-xs text-muted-text mt-1">
                    I have read and agree to the vendor terms and conditions outlined above.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 9: Vendor Verification */}
          {currentStep === 9 && (
            <div className="space-y-6">
              <h2 className="font-heading text-xl mb-6">Vendor Verification</h2>
              <p className="font-body text-sm text-muted-text mb-6">
                Upload clear photos to verify your business. These images help us ensure quality standards on the platform.
              </p>

              <div>
                <Label className="font-body text-sm uppercase tracking-wider mb-3 block">
                  Upload at least 2 photos of jerseys you have produced or sold *
                </Label>
                {formData.verification.jersey_photos.map((photo, index) => (
                  <div key={index} className="mb-3">
                    <div className="flex items-center gap-3">
                      <Input
                        type="file"
                        accept="image/*"
                        className="flex-1"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          const uploadData = new FormData();
                          uploadData.append('file', file);
                          
                          try {
                            toast.loading("Uploading image...", { id: `upload-jersey-${index}` });
                            const res = await axios.post(`${API}/upload/vendor-image`, uploadData, {
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            const newPhotos = [...formData.verification.jersey_photos];
                            newPhotos[index] = res.data.path;
                            updateFormData('verification', 'jersey_photos', newPhotos);
                            toast.success("Image uploaded!", { id: `upload-jersey-${index}` });
                          } catch (error) {
                            toast.error(error.response?.data?.detail || "Upload failed", { id: `upload-jersey-${index}` });
                          }
                        }}
                      />
                      {photo && (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-16 border border-black/10 overflow-hidden flex-shrink-0">
                            <img 
                              src={`${API}/files/${photo}`} 
                              alt={`Jersey ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUploadedImage(
                              photo,
                              () => {
                                const newPhotos = [...formData.verification.jersey_photos];
                                newPhotos[index] = "";
                                updateFormData('verification', 'jersey_photos', newPhotos);
                              },
                              `delete-jersey-${index}`
                            )}
                          >
                            <X size={14} className="mr-1" /> Remove
                          </Button>
                        </div>
                      )}
                    </div>
                    {photo && (
                      <p className="text-xs text-ghana-green mt-1 flex items-center gap-1">
                        <Check size={12} /> Uploaded successfully
                      </p>
                    )}
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => updateFormData('verification', 'jersey_photos', [...formData.verification.jersey_photos, ""])}
                >
                  <Plus size={14} className="mr-1" /> Add More Photos
                </Button>
              </div>

              <div>
                <Label className="font-body text-sm uppercase tracking-wider mb-3 block">
                  Upload a photo of your product packaging or delivery preparation
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept="image/*"
                    className="flex-1"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      const uploadData = new FormData();
                      uploadData.append('file', file);
                      
                      try {
                        toast.loading("Uploading image...", { id: 'upload-packaging' });
                        const res = await axios.post(`${API}/upload/vendor-image`, uploadData, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        updateFormData('verification', 'packaging_photo', res.data.path);
                        toast.success("Image uploaded!", { id: 'upload-packaging' });
                      } catch (error) {
                        toast.error(error.response?.data?.detail || "Upload failed", { id: 'upload-packaging' });
                      }
                    }}
                  />
                  {formData.verification.packaging_photo && (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-16 border border-black/10 overflow-hidden flex-shrink-0">
                        <img 
                          src={`${API}/files/${formData.verification.packaging_photo}`} 
                          alt="Packaging"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUploadedImage(
                          formData.verification.packaging_photo,
                          () => updateFormData('verification', 'packaging_photo', ""),
                          "delete-packaging"
                        )}
                      >
                        <X size={14} className="mr-1" /> Remove
                      </Button>
                    </div>
                  )}
                </div>
                {formData.verification.packaging_photo && (
                  <p className="text-xs text-ghana-green mt-1 flex items-center gap-1">
                    <Check size={12} /> Uploaded successfully
                  </p>
                )}
              </div>

              <div className="bg-ghana-green/10 border border-ghana-green/30 p-4">
                <p className="font-body text-sm">
                  <strong>Tip:</strong> Use clear, well-lit photos that show your jersey quality and packaging standards. This helps build trust with your future customers.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-black/10">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="border-black"
            >
              <ChevronLeft size={16} className="mr-1" /> Previous
            </Button>
            
            {currentStep < totalSteps ? (
              <Button onClick={nextStep} className="bg-black hover:bg-ashanti-gold hover:text-black">
                Next <ChevronRight size={16} className="ml-1" />
              </Button>
            ) : (
              <Button 
                onClick={submitOnboarding} 
                disabled={loading}
                className="bg-ghana-green hover:bg-ghana-green/80"
              >
                {loading ? "Submitting..." : "Submit Application"}
              </Button>
            )}
          </div>
        </div>

        {/* Step Summary */}
        <div className="mt-6 text-center font-body text-sm text-muted-text">
          Step {currentStep} of {totalSteps}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default VendorOnboarding;
