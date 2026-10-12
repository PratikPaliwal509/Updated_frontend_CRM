import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import ClientsEditHeader from '@/components/clientsViewCreate/ClientsEditHeader';
import ClientsEditContent from '@/components/clientsViewCreate/ClientsEditContent';
import Swal from 'sweetalert2';
import { verifyPagePermission } from '@/utils/verifyPagePermission'
import { toast } from 'react-toastify';
import Footer from '@/components/shared/Footer';
import { API_BASE_URL } from '../config/api';
import { uploadImage } from '@/utils/uploadImage';
const ClientEdit = () => {
    const { id } = useParams(); // get client id from route
    const [agencies, setAgencies] = useState([]);

    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        agency_id: '',
        company_name: '',
        industry: '',
        company_size: '',
        website: '',
        primary_contact_name: '',
        primary_contact_email: '',
        primary_contact_phone: '',
        country: '',
        status: 'active',
        account_manager_id: '',   // ✅ NEW
        logo_url: '',              // ✅ Cloudinary URL
    });

    useEffect(() => {
        const checkPermission = async () => {
            await verifyPagePermission('clients', 'edit', navigate);
        };
        checkPermission();
    }, []);

    /* ================= FETCH Users ================= */
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const token = localStorage.getItem('token')

                const response = await fetch(`${API_BASE_URL}/api/users/client-portal-users`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })

                if (!response.ok) throw new Error('Failed to fetch users')

                const data = await response.json()
                setUsers(data.data || [])
            } catch (error) {
                console.error('Users fetch error', error)
            }
        }

        fetchUsers()
    }, [])
    /* ================= FETCH AGENCIES ================= */
    useEffect(() => {
        const fetchAgencies = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/api/agencies`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                const data = await response.json();
                setAgencies(data || []);
            } catch (error) {
                console.error('Agency fetch error', error);
            }
        };

        fetchAgencies();
    }, []);

    /* ================= FETCH CLIENT DATA ================= */
    useEffect(() => {
        const fetchClient = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/api/clients/client/${id}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                const data = await response.json();

                setFormData({
                    agency_id: data.data.agency_id || '',
                    company_name: data.data.company_name || '',
                    industry: data.data.industry || '',
                    company_size: data.data.company_size || '',
                    website: data.data.website || '',
                    primary_contact_name: data.data.primary_contact_name || '',
                    primary_contact_email: data.data.primary_contact_email || '',
                    primary_contact_phone: data.data.primary_contact_phone || '',
                    country: data.data.country || '',
                    status: data.data.status || 'active',
                    portal_user_id: data.data.portal_user_id || '',
                    account_manager_id: data.data.account_manager_id || '',   // ✅ NEW
                    logo_url: data.data.logo_url || '',              // ✅ Cloudinary URL
                });
            } catch (error) {
                console.error('Client fetch error', error);
            }
        };

        fetchClient();
    }, [id]);

    /* ================= HANDLE INPUT ================= */
    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = async (e) => {
        try {
            const file = e.target.files[0];
            if (!file) return;

            setLoading(true);

            const url = await uploadImage(file, 'client_logo'); // signed upload (no open preset)

            setFormData(prev => ({
                ...prev,
                logo_url: url,
            }));
        } catch (error) {
            Swal.fire('Error', error.message || 'File upload failed', 'error');
        } finally {
            setLoading(false);
        }
    };



    /* ================= UPDATE CLIENT ================= */
    const handleUpdate = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            const response = await fetch(`${API_BASE_URL}/api/clients/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            // ❌ HTTP error - show the API's reason (the Response object has no .message)
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || 'Update failed');
            }

            // ❌ Logical failure (very important)
            if (response.success === false) {
                throw new Error(response.message || 'Client not updated');
            }

            const data = await response.json();
            await Swal.fire({
                icon: 'success',
                title: 'Client Updated',
                text: 'Client details updated successfully.',
                confirmButtonText: 'OK',
            });

            // ✅ REDIRECT TO PREVIOUS PAGE
            navigate(-1);

        } catch (error) {
            console.error('Update client error', error);
            toast.error(error.message || 'Failed to update client');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <PageHeader>
                <ClientsEditHeader
                    loading={loading}
                    onUpdate={handleUpdate}
                />
            </PageHeader>

            <div className="main-content">
                <div className="row">
                    <ClientsEditContent
                        formData={formData}
                        agencies={agencies}
                        users={users}
                        onChange={handleChange}
                        onFileChange={handleFileChange}
                    />
                </div>
            </div>
            <Footer/>
        </>
    );
};

export default ClientEdit;
