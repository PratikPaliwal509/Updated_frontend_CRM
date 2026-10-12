
import React from "react";

import Table from "@/components/shared/table/Table";
import Dropdown from "@/components/shared/Dropdown";
import Loader from "../loader";

import {
    FiEdit3,
    FiEye,
    FiMoreHorizontal,
    FiImage
} from "react-icons/fi";

import {
    useNavigate
} from "react-router-dom";

import { usePagedList, changeStatus } from "../meta/adsApi";

const AdsTable = ({
    adSetId,
    ads,
    setAds
}) => {
    const navigate = useNavigate();

    // first page + "Load more" (Meta cursor paging, F-086)
    const { loading, loadingMore, hasMore, loadMore } = usePagedList({
        path: `/api/meta-ads/adsets/${adSetId}/ads`,
        enabled: !!adSetId,
        setRows: setAds,
        map: (ad) => ({
            id: ad.id,
            name: ad.name || "Unnamed Ad",
            creative: ad.creative?.id || "—",
            status: ad.status || "UNKNOWN",
            createdAt: ad.created_time ? new Date(ad.created_time).toLocaleDateString() : "—"
        })
    });

    const columns = [

        {
            accessorKey: "id",

            header: ({ table }) => (
                <input
                    type="checkbox"
                    className="custom-table-checkbox"
                    checked={
                        table.getIsAllRowsSelected()
                    }
                    onChange={
                        table.getToggleAllRowsSelectedHandler()
                    }
                />
            ),

            cell: ({ row }) => (
                <input
                    type="checkbox"
                    className="custom-table-checkbox"
                    checked={
                        row.getIsSelected()
                    }
                    onChange={
                        row.getToggleSelectedHandler()
                    }
                />
            ),

            meta: {
                headerClassName: "width-30"
            }
        },

        {
            accessorKey: "name",

            header: () => "Ad",

            cell: (info) => {

                const ad =
                    info.row.original;

                return (
                    <div className="hstack gap-3">

                        <div className="avatar-text avatar-md">
                            <FiImage />
                        </div>

                        <span
                            className="fw-semibold cursor-pointer"
                            onClick={() =>
                                navigate(
                                    `/meta-ads/ads/view/${ad.id}`
                                )
                            }
                        >
                            {ad.name}
                        </span>

                    </div>
                );
            }
        },

        {
            accessorKey: "creative",

            header: () => "Creative ID"
        },

        {
            accessorKey: "createdAt",

            header: () => "Created Date"
        },

        {
            accessorKey: "status",

            header: () => "Status",

            cell: (info) => {

                const row =
                    info.row.original;

                return (
                    <select
                        className="form-select"
                        value={row.status}
                        onChange={async (e) => {
                            const status = e.target.value;
                            const applied = await changeStatus(`/api/meta-ads/ads/${row.id}/status`, status);
                            if (applied) setAds((prev) => prev.map((item) => (item.id === row.id ? { ...item, status } : item)));
                        }}
                    >

                        <option value="ACTIVE">
                            Active
                        </option>

                        <option value="PAUSED">
                            Paused
                        </option>

                    </select>
                );
            }
        },

        {
            accessorKey: "actions",

            header: () => "Actions",

            cell: ({ row }) => {

                const id =
                    row.original.id;

                const actions = [

                    {
                        label: "Edit",

                        icon: <FiEdit3 />,

                        onClick: () =>
                            navigate(
                                `/meta-ads/ads/edit/${id}`
                            )
                    },

                    {
                        label: "Creative",

                        icon: <FiImage />,

                        onClick: () =>
                            navigate(
                                `/meta-ads/ads/${id}/creatives`
                            )
                    }
                ];

                return (
                    <div className="hstack gap-2 justify-content-end">

                        <span className="avatar-text avatar-md">

                            <FiEye
                                className="cursor-pointer"

                                onClick={() =>
                                    navigate(
                                        `/meta-ads/ads/view/${id}`
                                    )
                                }
                            />

                        </span>

                        <Dropdown
                            dropdownItems={
                                actions
                            }

                            triggerClass="avatar-md"

                            triggerPosition="0,21"

                            triggerIcon={
                                <FiMoreHorizontal />
                            }
                        />

                    </div>
                );
            },

            meta: {
                headerClassName:
                    "text-end"
            }
        }
    ];


    if (loading) {
        return <Loader />;
    }


    return (
        <>
            <Table
                data={ads || []}
                columns={columns}
            />
            {hasMore && (
                <div className="text-center my-3">
                    <button type="button" className="btn btn-light-brand" disabled={loadingMore} onClick={loadMore}>
                        {loadingMore ? "Loading..." : "Load more ads"}
                    </button>
                </div>
            )}
        </>
    );
};

export default AdsTable;
