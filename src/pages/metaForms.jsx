import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import PageHeader from '../components/shared/pageHeader/PageHeader';
import Footer from '../components/shared/Footer';

import MetaFormsHeader from '../components/metaForms/MetaFormsHeader';
import MetaFormsContent from '../components/metaForms/MetaFormsContent';
import CreateMetaFormModal from '../components/metaForms/CreateMetaFormModal';

import { toast } from 'react-toastify';
import { API_BASE_URL } from '../config/api';
import usePages from '../components/meta/usePages';
import { PagePicker, ConnectHint } from '../components/meta/PagePicker';

const MetaForms = () => {

    const navigate = useNavigate();
    const { pages, selected, setSelected, error: pagesError, notConnected } = usePages();

    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(false);

    const [showCreateModal, setShowCreateModal] =
        useState(false);

    /* ================= FETCH FORMS ================= */

    const fetchForms = async () => {

        try {

            setLoading(true);

            const token = localStorage.getItem('token');

            const response = await fetch(
                `${API_BASE_URL}/api/meta-leads/forms?pageId=${selected}`,
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
                    'Failed to fetch Facebook forms'
                );
            }

            setForms(result.data?.data || []);

        } catch (error) {

            console.error(
                'Facebook forms fetch error:',
                error
            );

            toast.error(
                error.message ||
                'Failed to fetch Facebook forms'
            );

        } finally {

            setLoading(false);

        }

    };

    /* ================= INITIAL FETCH ================= */

    useEffect(() => {
        setForms([]);
        if (selected) fetchForms();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected]);

    /* ================= FORM CREATED ================= */

    const handleFormCreated = (createdForm) => {

        toast.success(
            'Facebook lead form created successfully!'
        );

        /*
         * Refresh forms from Meta so the newly
         * created form appears in the list.
         */

        fetchForms();

    };

    /* ================= OPEN FORM ================= */

    const handleFormClick = (form) => {

        navigate(
            `/meta/forms/${encodeURIComponent(form.id)}/leads`,
            {
                state: {
                    pageId: selected,
                    formName: form.name,
                    formStatus: form.status,
                },
            }
        );

    };

    return (
        <>
            {/* ================= PAGE HEADER ================= */}

            <PageHeader>

                <MetaFormsHeader
                    loading={loading}
                    formCount={forms.length}
                    onRefresh={fetchForms}
                    onCreateForm={() =>
                        setShowCreateModal(true)
                    }
                    picker={<PagePicker pages={pages} selected={selected} onChange={setSelected} disabled={loading} />}
                />

            </PageHeader>

            {/* ================= MAIN CONTENT ================= */}

            <div className="main-content">

                <div
                    className="row"
                    style={{ minHeight: '60vh' }}
                >

                    {notConnected || pagesError ? <ConnectHint error={pagesError} /> : (
                    <MetaFormsContent
                        forms={forms}
                        loading={loading}
                        onFormClick={handleFormClick}
                    />
                    )}

                </div>

            </div>

            <Footer />

            {/* ================= CREATE FORM MODAL ================= */}

            <CreateMetaFormModal
                show={showCreateModal}
                onClose={() =>
                    setShowCreateModal(false)
                }
                onSuccess={handleFormCreated}
                pageId={selected}
            />

        </>
    );
};

export default MetaForms;