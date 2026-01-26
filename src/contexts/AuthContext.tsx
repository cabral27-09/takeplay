import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionTier, getTierByProductId } from '@/lib/subscription-tiers';

type AppRole = 'viewer' | 'producer' | 'admin';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface SubscriptionInfo {
  subscribed: boolean;
  subscriptionEnd: string | null;
  tier: SubscriptionTier;
  productId: string | null;
  adminGranted: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  isLoading: boolean;
  isSubscriptionLoading: boolean;
  subscription: SubscriptionInfo;
  signUp: (email: string, password: string, fullName: string, role: AppRole) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  checkSubscription: () => Promise<SubscriptionInfo>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    subscribed: false,
    subscriptionEnd: null,
    tier: 'free',
    productId: null,
    adminGranted: false,
  });

  const checkSubscription = useCallback(async (): Promise<SubscriptionInfo> => {
    setIsSubscriptionLoading(true);
    const defaultSub: SubscriptionInfo = { subscribed: false, subscriptionEnd: null, tier: 'free', productId: null, adminGranted: false };
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSubscription(defaultSub);
        return defaultSub;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking subscription:', error);
        return defaultSub;
      }

      let newSubscription: SubscriptionInfo;

      // Check if it's an admin-granted subscription (has tier directly)
      if (data?.admin_granted && data?.tier) {
        newSubscription = {
          subscribed: data.tier !== 'free',
          subscriptionEnd: data.subscription_end ?? null,
          tier: data.tier as SubscriptionTier,
          productId: null,
          adminGranted: true,
        };
      } else {
        // Otherwise, use Stripe-based subscription
        const productId = data?.product_id ?? null;
        const tier = getTierByProductId(productId);

        newSubscription = {
          subscribed: data?.subscribed ?? false,
          subscriptionEnd: data?.subscription_end ?? null,
          tier,
          productId,
          adminGranted: false,
        };
      }

      setSubscription(newSubscription);
      return newSubscription;
    } catch (error) {
      console.error('Error checking subscription:', error);
      return defaultSub;
    } finally {
      setIsSubscriptionLoading(false);
    }
  }, []);

  const fetchUserData = async (userId: string) => {
    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (profileData) {
      setProfile(profileData);
    }

    // Fetch roles
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (rolesData) {
      setRoles(rolesData.map(r => r.role as AppRole));
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer Supabase calls with setTimeout to avoid deadlock
          setTimeout(() => {
            fetchUserData(session.user.id);
            checkSubscription();
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setSubscription({ subscribed: false, subscriptionEnd: null, tier: 'free', productId: null, adminGranted: false });
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
        checkSubscription();
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [checkSubscription]);

  // Refresh subscription when tab becomes visible (returning from Stripe checkout)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session) {
        checkSubscription();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session, checkSubscription]);

  const signUp = async (email: string, password: string, fullName: string, role: AppRole) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
    setSubscription({ subscribed: false, subscriptionEnd: null, tier: 'free', productId: null, adminGranted: false });
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        isLoading,
        isSubscriptionLoading,
        subscription,
        signUp,
        signIn,
        signOut,
        hasRole,
        checkSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
