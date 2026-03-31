import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import axios from "axios";
import { useAuth, API, ADMIN_PORTAL_PATH } from "../App";
import { toast } from "sonner";

const AuthPage = ({ mode = "vendor" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, loginWithGoogle, logout } = useAuth();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  const from = location.state?.from?.pathname || "/";
  const isAdminMode = mode === "admin";
  const allowRegistration = !isAdminMode;

  const resolvePostAuthDestination = async (user) => {
    if (user.role === "admin") {
      return ADMIN_PORTAL_PATH;
    }

    if (user.role !== "vendor") {
      return from;
    }

    const authToken = localStorage.getItem("auth_token");
    if (!authToken) {
      return "/vendor";
    }

    try {
      const response = await axios.get(`${API}/vendor/onboarding-status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      return response.data.vendor_status === "approved" ? "/vendor" : "/vendor/onboarding";
    } catch (error) {
      return "/vendor";
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const user = await login(loginEmail, loginPassword);
      if (isAdminMode && user.role !== "admin") {
        await logout();
        toast.error("This portal is reserved for administrators only");
        return;
      }
      if (!isAdminMode && user.role === "admin") {
        await logout();
        toast.error("Please use the private admin portal to sign in");
        navigate("/");
        return;
      }
      toast.success(`Welcome back, ${user.name}!`);
      navigate(await resolvePostAuthDestination(user));
    } catch (error) {
      toast.error(error.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerName || !registerEmail || !registerPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (registerPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const user = await register(registerEmail, registerPassword, registerName, "vendor");
      toast.success(`Welcome, ${user.name}!`);
      navigate(await resolvePostAuthDestination(user));
    } catch (error) {
      toast.error(error.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const portalTitle = isAdminMode ? "Admin Portal" : "Vendor Portal";
  const portalDescription = isAdminMode
    ? "Use your administrator credentials to access the control room."
    : "Sign in to manage onboarding, products, approvals, and vendor orders.";

  return (
    <div className="min-h-screen bg-bone-white flex" data-testid="auth-page">
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200"
          alt="Football"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-center text-white px-12">
            <div className="flex justify-center mb-8">
              <img
                src="https://customer-assets.emergentagent.com/job_f5f5b77d-4869-424b-bf9b-df9ab6eb583a/artifacts/nhldagq1_black%20star-01.svg"
                alt="Black Star"
                className="w-16 h-16 invert opacity-90"
              />
            </div>
            <h2 className="font-heading text-3xl tracking-widest uppercase mb-4">Black Star Threads</h2>
            <p className="font-body text-white/70">Heritage Woven with Modern Craftsmanship</p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-12">
            <Link to="/" className="inline-flex items-center gap-2">
              <img
                src="https://customer-assets.emergentagent.com/job_f5f5b77d-4869-424b-bf9b-df9ab6eb583a/artifacts/nhldagq1_black%20star-01.svg"
                alt="Black Star"
                className="w-8 h-8"
              />
              <span className="font-heading text-lg tracking-widest uppercase">Black Star Threads</span>
            </Link>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className={`grid w-full ${allowRegistration ? "grid-cols-2" : "grid-cols-1"} bg-transparent border-b border-black/10 rounded-none h-auto p-0`}>
              <TabsTrigger
                value="login"
                className="font-body text-sm uppercase tracking-widest rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent py-4"
                data-testid="tab-login"
              >
                Sign In
              </TabsTrigger>
              {allowRegistration && (
                <TabsTrigger
                  value="register"
                  className="font-body text-sm uppercase tracking-widest rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent py-4"
                  data-testid="tab-register"
                >
                  Register
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="login" className="mt-8">
              <div className="mb-6">
                <h1 className="font-heading text-2xl tracking-widest uppercase">{portalTitle}</h1>
                <p className="font-body text-sm text-muted-text mt-2">{portalDescription}</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <Label className="font-body text-sm uppercase tracking-wider">Email</Label>
                  <div className="relative mt-2">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-text" />
                    <Input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="pl-12 rounded-none border-black/20 focus:border-black py-6"
                      data-testid="login-email"
                    />
                  </div>
                </div>

                <div>
                  <Label className="font-body text-sm uppercase tracking-wider">Password</Label>
                  <div className="relative mt-2">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-text" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-12 pr-12 rounded-none border-black/20 focus:border-black py-6"
                      data-testid="login-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-text"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black text-white hover:bg-ashanti-gold hover:text-black py-6 font-body uppercase tracking-widest"
                  data-testid="login-submit"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              {!isAdminMode && (
                <>
                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-black/10"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-bone-white px-4 font-body text-sm text-muted-text">or continue with</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={loginWithGoogle}
                    className="w-full border-black py-6 font-body uppercase tracking-widest"
                    data-testid="google-login"
                  >
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign in with Google
                  </Button>
                </>
              )}
            </TabsContent>

            {allowRegistration && (
              <TabsContent value="register" className="mt-8">
                <div className="mb-6">
                  <h1 className="font-heading text-2xl tracking-widest uppercase">Vendor Registration</h1>
                  <p className="font-body text-sm text-muted-text mt-2">
                    Create a vendor account to complete onboarding and submit jerseys for approval.
                  </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-6">
                  <div>
                    <Label className="font-body text-sm uppercase tracking-wider">Full Name</Label>
                    <div className="relative mt-2">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-text" />
                      <Input
                        type="text"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        placeholder="Your full name"
                        className="pl-12 rounded-none border-black/20 focus:border-black py-6"
                        data-testid="register-name"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="font-body text-sm uppercase tracking-wider">Email</Label>
                    <div className="relative mt-2">
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-text" />
                      <Input
                        type="email"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="pl-12 rounded-none border-black/20 focus:border-black py-6"
                        data-testid="register-email"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="font-body text-sm uppercase tracking-wider">Password</Label>
                    <div className="relative mt-2">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-text" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-12 pr-12 rounded-none border-black/20 focus:border-black py-6"
                        data-testid="register-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-text"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="border border-black/10 bg-black/[0.02] p-4">
                    <p className="font-body text-sm font-semibold uppercase tracking-wide">Account Type</p>
                    <p className="font-body text-sm mt-2">Vendor account</p>
                    <p className="font-body text-xs text-muted-text mt-1">
                      Customer account signup is no longer shown on this public vendor portal.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-black text-white hover:bg-ashanti-gold hover:text-black py-6 font-body uppercase tracking-widest"
                    data-testid="register-submit"
                  >
                    {loading ? "Creating account..." : "Create Vendor Account"}
                  </Button>
                </form>

                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-black/10"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-bone-white px-4 font-body text-sm text-muted-text">or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={loginWithGoogle}
                  className="w-full border-black py-6 font-body uppercase tracking-widest"
                  data-testid="google-register"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign up with Google
                </Button>
              </TabsContent>
            )}
          </Tabs>

          <p className="text-center mt-8 font-body text-sm text-muted-text">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
