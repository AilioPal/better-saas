import type { JSX } from 'react';

// 菜单项类型
export interface MenuItem {
  title: string;
  url: string;
  description?: string;
  icon?: JSX.Element;
  items?: MenuItem[];
  onClick?: () => void;
}

// Logo配置类型
export interface LogoConfig {
  url: string;
  src: string;
  alt: string;
  title: string;
}

// 认证配置类型
export interface AuthConfig {
  login: {
    text: string;
    url: string;
  };
  signup: {
    text: string;
    url: string;
  };
}

// 导航栏组件的props类型
export interface NavbarProps {
  logo: LogoConfig;
  menu: MenuItem[];
  auth: AuthConfig;
  locale: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  onPricingClick: () => void;
}

// useNavbar Hook返回类型
export interface UseNavbarReturn {
  logo: LogoConfig;
  menu: MenuItem[];
  auth: AuthConfig;
  locale: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  handlePricingClick: () => void;
}
