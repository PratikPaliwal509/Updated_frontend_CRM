import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import MetaPostsHeader from '@/components/metaPosts/MetaPostsHeader';
import MetaPostsContent from '@/components/metaPosts/MetaPostsContent';
import Footer from '@/components/shared/Footer';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import GenerateReportModal from '@/components/metaPosts/GenerateReportModal';
import CommentsPanel from '@/components/meta/CommentsPanel';
import usePages from '@/components/meta/usePages';
import { PagePicker, ConnectHint, metaErrorText } from '@/components/meta/PagePicker';
import { api } from '@/utils/authSession';

/**
 * Facebook posts of the selected Page (workspace Pages from Settings → Integrations):
 * paginated list, edit text, delete, comments, report.
 */
const MetaPosts = () => {
    const navigate = useNavigate();
    const { pages, page, selected, setSelected, loading: pagesLoading, error: pagesError, notConnected } = usePages();
    const [showReportModal, setShowReportModal] = useState(false);
    const [posts, setPosts] = useState([]);
    const [next, setNext] = useState(null);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [commentsFor, setCommentsFor] = useState(null);

    /* ================= FETCH POSTS ================= */
    const fetchPosts = useCallback(async ({ more = false } = {}) => {
        if (!selected) return;
        try {
            setLoading(true);
            const q = new URLSearchParams({ limit: '24', ...(more && next ? { after: next } : {}) });
            const result = await api(`/api/meta/pages/${selected}/posts?${q}`);
            setPosts((prev) => (more ? [...prev, ...result.data] : result.data));
            setNext(result.next);
        } catch (error) {
            toast.error(metaErrorText(error) || 'Failed to fetch Facebook posts');
            if (!more) setPosts([]);
        } finally {
            setLoading(false);
        }
    }, [selected, next]);

    useEffect(() => {
        setPosts([]);
        setNext(null);
        if (selected) fetchPosts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected]);

    /* ================= DELETE POST ================= */
    const handleDelete = async (postId) => {
        const confirm = await Swal.fire({
            title: 'Delete Facebook Post?',
            text: `This post will be deleted from "${page?.name || 'the Facebook Page'}".`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Delete',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#d33',
        });
        if (!confirm.isConfirmed) return;
        try {
            setDeletingId(postId);
            await api(`/api/meta/pages/${selected}/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' });
            setPosts((prev) => prev.filter((post) => post.id !== postId));
            toast.success('Facebook post deleted');
        } catch (error) {
            toast.error(metaErrorText(error) || 'Failed to delete Facebook post');
        } finally {
            setDeletingId(null);
        }
    };

    /* ================= EDIT POST TEXT ================= */
    const handleEdit = async (post) => {
        const { value, isConfirmed } = await Swal.fire({
            title: 'Edit post text',
            input: 'textarea',
            inputValue: post.message || '',
            inputAttributes: { 'aria-label': 'Post text', maxlength: 63206 },
            showCancelButton: true,
            confirmButtonText: 'Save',
            inputValidator: (v) => (!v || !v.trim() ? 'The text cannot be empty' : undefined),
        });
        if (!isConfirmed) return;
        try {
            await api(`/api/meta/pages/${selected}/posts/${encodeURIComponent(post.id)}`, { method: 'PATCH', body: { message: value } });
            setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, message: value.trim() } : p)));
            toast.success('Post updated on Facebook');
        } catch (error) {
            toast.error(metaErrorText(error));
        }
    };

    return (
        <>
            {/* ================= PAGE HEADER ================= */}
            <PageHeader>
                <MetaPostsHeader
                    loading={loading}
                    postCount={posts.length}
                    onRefresh={() => fetchPosts()}
                    onCreatePost={() => navigate('/meta/posts/create')}
                    onGenerateReport={() => setShowReportModal(true)}
                    picker={<PagePicker pages={pages} selected={selected} onChange={setSelected} disabled={loading} />}
                />
            </PageHeader>

            {/* ================= MAIN CONTENT ================= */}
            <div className="main-content">
                <div className="row">
                    {notConnected || pagesError ? <ConnectHint error={pagesError} /> : (
                        <MetaPostsContent
                            posts={posts}
                            loading={loading || pagesLoading}
                            deletingId={deletingId}
                            onDelete={handleDelete}
                            onEdit={handleEdit}
                            onComments={(post) => setCommentsFor(post)}
                            page={page}
                        />
                    )}
                    {next && (
                        <div className="col-12 text-center mb-4">
                            <button type="button" className="btn btn-light-brand" disabled={loading} onClick={() => fetchPosts({ more: true })}>
                                {loading ? 'Loading...' : 'Load more posts'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <Footer />
            <GenerateReportModal
                show={showReportModal}
                onClose={() => setShowReportModal(false)}
                pageId={selected}
                pageName={page?.name}
            />
            {commentsFor && (
                <CommentsPanel pageId={selected} post={commentsFor} onClose={() => setCommentsFor(null)} />
            )}
        </>
    );
};

export default MetaPosts;
