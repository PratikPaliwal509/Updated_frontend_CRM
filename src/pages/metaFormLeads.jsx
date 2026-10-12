import React, { useEffect, useState } from 'react';
import {
    useNavigate,
    useParams,
    useLocation,
} from 'react-router-dom';

import PageHeader from '../components/shared/pageHeader/PageHeader';
import Footer from '../components/shared/Footer';

import MetaLeadsHeader from '../components/metaForms/MetaLeadsHeader';
import MetaLeadsContent from '../components/metaForms/MetaLeadsContent';

import { toast } from 'react-toastify';
import { API_BASE_URL } from '../config/api';
import { api } from '../utils/authSession';

const savedPage = () => { try { return Number(localStorage.getItem('tl_meta_page')) || null } catch { return null } };

const MetaFormLeads = () => {

    const navigate = useNavigate();

    const { formId } = useParams();

    const location = useLocation();

    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    // the Page the form belongs to (from the forms list, else the Page picked last)
    const pageId = location.state?.pageId || savedPage();

    /* ================= FORM DETAILS ================= */

    const formName =
        location.state?.formName || 'Facebook Leads';

    /* ================= FETCH LEADS ================= */

    const fetchLeads = async () => {

        try {

            setLoading(true);

            const token = localStorage.getItem('token');

            const response = await fetch(
                `${API_BASE_URL}/api/meta-leads/forms/${encodeURIComponent(formId)}/leads${pageId ? `?pageId=${pageId}` : ''}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {

                throw new Error(
                    result.message || `HTTP error! Status: ${response.status}`
                );

            }

            if (!result.success) {

                throw new Error(
                    result.message ||
                    'Failed to fetch Facebook leads'
                );

            }

            /*
             * Expected:
             *
             * {
             *   success: true,
             *   data: {
             *      data: [...]
             *   }
             * }
             */

            setLeads(
                result.data?.data || []
            );

        } catch (error) {

            console.error(
                'Facebook leads fetch error:',
                error
            );

            toast.error(
                error.message ||
                'Failed to fetch Facebook leads'
            );

        } finally {

            setLoading(false);

        }

    };

    /* ================= FETCH ON FORM CHANGE ================= */

    useEffect(() => {

        if (formId) {
            fetchLeads();
        }

    }, [formId]);

    /* ================= BACK ================= */

    /* ================= IMPORT INTO CRM LEADS ================= */

    const handleImport = async () => {
        if (!pageId) return toast.error('Choose the Page on the Lead Forms screen first');
        try {
            setImporting(true);
            const r = await api(`/api/meta/pages/${pageId}/forms/${encodeURIComponent(formId)}/import`, { method: 'POST' });
            toast.success(`${r.created} new lead${r.created === 1 ? '' : 's'} saved to CRM Leads${r.already_in_crm ? ` (${r.already_in_crm} were already there)` : ''}`);
            fetchLeads();
        } catch (error) {
            toast.error(error.message || 'Import failed');
        } finally {
            setImporting(false);
        }
    };

    const handleBack = () => {

        navigate('/meta/forms');

    };

    return (
        <>
            {/* ================= PAGE HEADER ================= */}

            <PageHeader>

                <MetaLeadsHeader
                    loading={loading}
                    leadCount={leads.length}
                    formName={formName}
                    onBack={handleBack}
                    onRefresh={fetchLeads}
                    onImport={handleImport}
                    importing={importing}
                />

            </PageHeader>

            {/* ================= MAIN CONTENT ================= */}

            <div className="main-content">

                <div
                    className="row"
                    style={{ minHeight: '60vh' }}
                >

                    <MetaLeadsContent
                        leads={leads}
                        loading={loading}
                    />

                </div>

            </div>

            <Footer />
        </>
    );
};

export default MetaFormLeads;