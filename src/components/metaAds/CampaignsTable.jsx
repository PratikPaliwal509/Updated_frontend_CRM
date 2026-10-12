import React, { useState } from "react";
import Table from "@/components/shared/table/Table";
import Dropdown from "@/components/shared/Dropdown";
import Loader from "../loader";

import {
    FiEdit3,
    FiEye,
    FiMoreHorizontal,
    FiTarget,
    FiLayers
} from "react-icons/fi";

import { useNavigate } from "react-router-dom";
import { usePagedList, changeStatus } from "../meta/adsApi";

const CampaignsTable = ({
    campaigns,
    setCampaigns
}) => {

    const navigate = useNavigate();

    const [updatingId, setUpdatingId] = useState(null);

    // first page + "Load more" (Meta cursor paging, F-086)
    const { loading, loadingMore, hasMore, loadMore } = usePagedList({
        path: "/api/meta-ads/campaigns",
        setRows: setCampaigns,
        map: (campaign) => ({
            id: campaign.id,
            name: campaign.name,
            objective: campaign.objective || "—",
            status: campaign.status || "UNKNOWN",
            createdAt: campaign.created_time ? new Date(campaign.created_time).toLocaleDateString() : "—"
        })
    });

    const handleStatusUpdate = async (campaignId, status) => {
        if (!window.confirm(`Are you sure you want to change campaign status to ${status}?`)) return;
        setUpdatingId(campaignId);
        const applied = await changeStatus(`/api/meta-ads/campaigns/${campaignId}/status`, status);
        // "sent for approval" keeps the old status until an approver applies it
        if (applied) setCampaigns((prev) => prev.map((c) => (c.id === campaignId ? { ...c, status } : c)));
        setUpdatingId(null);
    };

    const StatusCell = ({ row }) => {

        if (updatingId === row.id) {
            return (
                <div className="d-flex justify-content-center">
                    <div
                        className="spinner-border text-primary"
                        role="status"
                    />
                </div>
            );
        }

        return (
            <select
                value={row.status}
                onChange={(e) =>
                    handleStatusUpdate(
                        row.id,
                        e.target.value
                    )
                }
                className="form-select"
            >
                <option value="ACTIVE">
                    Active
                </option>

                <option value="PAUSED">
                    Paused
                </option>

                <option value="ARCHIVED">
                    Archived
                </option>
            </select>
        );
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

            header: () => "Campaign",

            cell: (info) => {

                const row =
                    info.row.original;

                return (
                    <div className="hstack gap-3">

                        <div className="avatar-text avatar-md">
                            <FiTarget />
                        </div>

                        <span
                            className="cursor-pointer fw-semibold"
                            onClick={() =>
                                navigate(
                                    `/meta-ads/campaigns/view/${row.id}`
                                )
                            }
                        >
                            {row.name}
                        </span>

                    </div>
                );
            }
        },

        {
            accessorKey: "objective",

            header: () => "Objective"
        },

        {
            accessorKey: "id",

            header: () => "Campaign ID",

            cell: (info) => (
                <div
                    style={{
                        maxWidth: "180px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                    }}
                >
                    {info.getValue()}
                </div>
            )
        },

        {
            accessorKey: "createdAt",

            header: () => "Created Date"
        },

        {
            accessorKey: "status",

            header: () => "Status",

            cell: (info) => (
                <StatusCell
                    row={info.row.original}
                />
            )
        },

        {
            accessorKey: "actions",

            header: () => "Actions",

            cell: ({ row }) => {

                const campaignId =
                    row.original.id;

                const rowActions = [
                    {
                        label: "Edit",
                        icon: <FiEdit3 />,
                        onClick: () =>
                            navigate(
                                `/meta-ads/campaigns/edit/${campaignId}`
                            )
                    },

                    {
                        label: "Ad Sets",
                        icon: <FiLayers />,
                        onClick: () =>
                            navigate(
                                `/meta-ads/campaigns/${campaignId}/adsets`
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
                                        `/meta-ads/campaigns/view/${campaignId}`
                                    )
                                }
                            />

                        </span>

                        <Dropdown
                            dropdownItems={
                                rowActions
                            }
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

    if (loading) {
        return <Loader />;
    }

    return (
        <>
            <Table
                data={campaigns}
                columns={columns}
            />
            {hasMore && (
                <div className="text-center my-3">
                    <button type="button" className="btn btn-light-brand" disabled={loadingMore} onClick={loadMore} data-testid="load-more-campaigns">
                        {loadingMore ? "Loading..." : "Load more campaigns"}
                    </button>
                </div>
            )}
        </>
    );
};

export default CampaignsTable;