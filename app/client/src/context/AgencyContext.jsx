import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AgencyContext = createContext(null);

export function AgencyProvider({ children }) {
  const [agencyUser, setAgencyUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('agencyUser');
    if (stored) setAgencyUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  const agencyLogin = async (email, password) => {
    const { data } = await api.post('/agency-auth/login', { email, password });
    localStorage.setItem('agencyToken', data.token);
    localStorage.setItem('agencyUser', JSON.stringify(data.user));
    setAgencyUser(data.user);
    return data;
  };

  const agencyLogout = () => {
    localStorage.removeItem('agencyToken');
    localStorage.removeItem('agencyUser');
    setAgencyUser(null);
  };

  return (
    <AgencyContext.Provider value={{ agencyUser, agencyLogin, agencyLogout, loading }}>
      {children}
    </AgencyContext.Provider>
  );
}

export const useAgency = () => useContext(AgencyContext);
