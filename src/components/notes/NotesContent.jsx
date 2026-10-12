import React, { useEffect, useState } from 'react'
import { FiStar, FiTrash2 } from 'react-icons/fi'
import PerfectScrollbar from "react-perfect-scrollbar"
import NotesHeader from './NotesHeader'
import NotesSidebar from './NotesSidebar'
import Footer from '@/components/shared/Footer'
import AddsNote from './AddsNote'
import { toast } from 'react-toastify'
import { API_BASE_URL } from '../../config/api';

const NotesContent = () => {
    const [data, setData] = useState([])
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [selectTab, setSelectTab] = useState("alls")
    const [noteType, setNoteType] = useState("clients") // clients | projects
    const [favourites, setFavourites] = useState([])
    const [showAddModal, setShowAddModal] = useState(false)
    const [clientsList, setClientsList] = useState([])
    const [projectsList, setProjectsList] = useState([])
    const [loading, setLoading] = useState(false)
    useEffect(() => {
        fetchNotes()
        fetchTargets()
    }, [noteType])

    // Real notes (client_notes / project_notes) of everything the user can see
    const fetchNotes = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem("token")
            const url = noteType === "clients" ? `${API_BASE_URL}/api/client-notes` : `${API_BASE_URL}/api/project-notes`
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "Unable to load notes")
            const formatted = (json.data || []).map(item => ({
                id: item.note_id,
                title: item.client?.company_name || item.project?.project_name,
                content: item.body,
                author: item.author?.full_name,
                pinned: item.is_pinned,
                date: item.created_at,
                category: noteType,
                link: item.client ? `/clients/view/${item.client.client_id}` : `/projects/view/${item.project?.project_id}`,
            }))
            setData(formatted)
        } catch (error) {
            toast.error(error.message || "Unable to load notes")
            setData([])
        } finally {
            setLoading(false)
        }
    }

    // Any client / project can get more notes (the old app only offered ones without a note)
    const fetchTargets = async () => {
        const token = localStorage.getItem("token")
        try {
            const res = await fetch(`${API_BASE_URL}/api/${noteType === "clients" ? "clients" : "projects"}`, { headers: { Authorization: `Bearer ${token}` } })
            const json = await res.json()
            if (noteType === "clients") setClientsList(json.data || [])
            else setProjectsList(json.data || [])
        } catch { /* lists stay empty */ }
    }

    const filteredData = selectTab === "alls" ? data : data.filter(note => note.category === selectTab)
    
    const handleDeleteNote = async (id) => {
        if (!window.confirm("Delete this note?")) return
        const token = localStorage.getItem("token")
        const res = await fetch(`${API_BASE_URL}/api/${noteType === "clients" ? "client-notes" : "project-notes"}/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) return toast.error(json.message || "Could not delete the note")
        setData(prev => prev.filter(note => note.id !== id))
    }
    const handleFavourite = (id) =>
        setFavourites(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        )

    return (
        <>
            {/* <NotesSidebar
                selectTab={selectTab}
                setSelectTab={setSelectTab}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                setShowAddModal={setShowAddModal}
            /> */}

            <div className="content-area" >
                <PerfectScrollbar>
                    <NotesHeader
                        setSidebarOpen={setSidebarOpen}
                        noteType={noteType}
                        setNoteType={setNoteType}
                    />

                    <div className="content-area-body pb-0" style={{minHeight:"65vh" }}>
                        <div className="d-flex justify-content-end mb-3">
                            <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>Add note</button>
                        </div>
                        {loading ? (
                            <div className="d-flex justify-content-center align-items-center py-5">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        ) : filteredData.filter(n => n.content && n.content.trim() !== "").length === 0 ? (
                            <div className="d-flex flex-column align-items-center justify-content-center py-5 text-muted">
                                <h6 className="mb-1">No notes found</h6>
                                <p className="fs-12">Add a note to get started</p>
                            </div>
                        ) : (
                            <div className="row note-has-grid">
                                {filteredData.map(note => (note.content && <div key={note.id} className="col-xxl-4 col-xl-6 col-lg-4 col-sm-6">
                                        <div className="card card-body mb-4 stretch stretch-full">
                                            <h5 className="note-title text-truncate mb-1"><a href={note.link}>{note.title}</a>{note.pinned && <span className="badge bg-soft-primary text-primary ms-2 fs-10">Pinned</span>}</h5>
                                            <p className="fs-11 text-muted">
                                                {note.author ? `${note.author} · ` : ''}{new Date(note.date).toLocaleDateString()}
                                            </p>
                                            <div className="note-content flex-grow-1">
                                                <p className="text-muted text-truncate-3-line">
                                                    {note.content || "No notes added"}
                                                </p>
                                            </div>

                                            <div className="d-flex align-items-center gap-1">
                                                {/* <span
                                                    className={`avatar-text avatar-sm ${favourites.includes(note.id) ? "favourite" : ""}`}
                                                    onClick={() => handleFavourite(note.id)}
                                                >
                                                    <FiStar />
                                                </span> */}

                                                <span
                                                    className="avatar-text avatar-sm"
                                                    onClick={() => handleDeleteNote(note.id)}
                                                >
                                                    <FiTrash2 />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                            
                                )
                                )}
                            </div>
                        )}
                    </div>
                    <Footer />
                </PerfectScrollbar>
            </div>
            {/* Add Notes Modal */}
            {showAddModal && (
                <AddsNote
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    noteType={noteType}
                    clientList={clientsList}
                    projectList={projectsList}
                    onNoteAdded={fetchNotes}
                />

            )}
        </>
    )
}

export default NotesContent
