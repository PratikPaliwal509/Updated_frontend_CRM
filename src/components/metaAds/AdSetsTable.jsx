import React, { useState } from "react";
import Table from "@/components/shared/table/Table";
import Dropdown from "@/components/shared/Dropdown";
import Loader from "../loader";

import {
    FiEdit3,
    FiEye,
    FiMoreHorizontal,
    FiFileText
} from "react-icons/fi";

import {
    useNavigate
} from "react-router-dom";

import { usePagedList, changeStatus, useAdCurrency, formatMinor } from "../meta/adsApi";

const AdSetsTable = ({
    campaignId,
    adSets,
    setAdSets
}) => {

    const navigate = useNavigate();

    const [updatingId, setUpdatingId] =
        useState(null);
    const { currency } = useAdCurrency();

    // first page + "Load more" (Meta cursor paging, F-086); budgets kept in Meta minor units
    const { loading, loadingMore, hasMore, loadMore } = usePagedList({
        path: `/api/meta-ads/${campaignId}/adsets`,
        enabled: !!campaignId,
        setRows: setAdSets,
        map: (adSet) => ({
            id: adSet.id,
            name: adSet.name,
            budgetMinor: adSet.daily_budget || adSet.lifetime_budget || null,
            budgetKind: adSet.daily_budget ? "daily" : adSet.lifetime_budget ? "lifetime" : null,
            optimization: adSet.optimization_goal || "—",
            status: adSet.status || "UNKNOWN",
            createdAt: adSet.created_time ? new Date(adSet.created_time).toLocaleDateString() : "—"
        })
    });

    const handleStatusUpdate = async (id, status) => {
        setUpdatingId(id);
        const applied = await changeStatus(`/api/meta-ads/adsets/${id}/status`, status);
        if (applied) setAdSets((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
        setUpdatingId(null);
    };

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

            header: () => "Ad Set",

            cell: (info) => {

                const item =
                    info.row.original;

                return (
                    <div className="hstack gap-3">

                        <div className="avatar-text avatar-md">
                            <FiFileText />
                        </div>

                        <span
                            className="fw-semibold cursor-pointer"
                            onClick={() =>
                                navigate(
                                    `/meta-ads/adsets/view/${item.id}`
                                )
                            }
                        >
                            {item.name}
                        </span>

                    </div>
                );
            }
        },

        {
            accessorKey: "budgetMinor",
            header: () => "Budget",
            cell: (info) => {
                const r = info.row.original;
                if (!r.budgetMinor) return "—";
                return `${formatMinor(r.budgetMinor, currency)} ${r.budgetKind === "daily" ? "/ day" : "lifetime"}`;
            }
        },

        {
            accessorKey: "optimization",
            header: () => "Optimization"
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

                if (updatingId === row.id) {
                    return (
                        <div className="spinner-border text-primary" />
                    );
                }

                return (
                    <select
                        className="form-select"
                        value={row.status}
                        onChange={(e) =>
                            handleStatusUpdate(
                                row.id,
                                e.target.value
                            )
                        }
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
                                `/meta-ads/adsets/edit/${id}`
                            )
                    },
                    {
                        label: "Ads",
                        icon: <FiFileText />,
                        onClick: () =>
                            navigate(
                                `/meta-ads/adsets/${id}/ads`
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
                                        `/meta-ads/adsets/view/${id}`
                                    )
                                }
                            />
                        </span>

                        <Dropdown
                            dropdownItems={actions}
                            triggerClass="avatar-md"
                            triggerPosition={"0,21"}
                            triggerIcon={
                                <FiMoreHorizontal />
                            }
                        />

                    </div>
                );
            },

            meta: {
                headerClassName: "text-end"
            }
        }
    ];

    if (loading)
        return <Loader />;

    return (
        <>
            <Table
                data={adSets}
                columns={columns}
            />
            {hasMore && (
                <div className="text-center my-3">
                    <button type="button" className="btn btn-light-brand" disabled={loadingMore} onClick={loadMore}>
                        {loadingMore ? "Loading..." : "Load more ad sets"}
                    </button>
                </div>
            )}
        </>
    );
};

export default AdSetsTable;