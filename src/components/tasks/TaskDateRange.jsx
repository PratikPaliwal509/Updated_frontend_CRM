import React, { useEffect, useState } from 'react'
import DatePicker from "react-datepicker";

// Calendar days are sent as YYYY-MM-DD (no time zone shift). Dates from the API are UTC midnights.
const ymd = (d) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null)
export const apiDateToLocal = (v) => {
    if (!v) return null
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

const TaskDateRange = ({ initialStartDate, initialEndDate, onChange }) => {
    const [startDate, setStartDate] = useState(initialStartDate || null);
    const [endDate, setEndDate] = useState(initialEndDate || null);

    // Update state when props change (e.g., when task data loads)
    useEffect(() => {
//         const formatDate = (date) => {
//     if (!date) return '';
//     const d = new Date(date);
//     const day = String(d.getDate()).padStart(2, '0');
//     const month = String(d.getMonth() + 1).padStart(2, '0');
//     const year = d.getFullYear();
//     return `${day}/${month}/${year}`;
// };
        setStartDate(initialStartDate || null);
        setEndDate(initialEndDate || null);
        // setStartDate(initialStartDate || null);
        // setEndDate(initialEndDate || null);
    }, [initialStartDate, initialEndDate]);

    return (
        <div className="col-12 mt-4">
            {/* <label className="form-label">Date Range:</label> */}

            <div className="input-group">
                <span className="input-group-text">Start Date</span>
                <DatePicker
                    placeholderText="Start date..."
                    selected={startDate}
                     dateFormat="dd/MM/yyyy"
                    showPopperArrow={false}
                    className="form-control"
                    popperPlacement="bottom-start"
                    onChange={(date) => {
                        setStartDate(date)
                        onChange?.(ymd(date), ymd(endDate))
                    }}
                />

                <span className="input-group-text">End Date</span>

                <DatePicker
                    placeholderText="End date..."
                    selected={endDate}
                    showPopperArrow={false}
                    minDate={startDate || undefined}
                     dateFormat="dd/MM/yyyy"
                    className="form-control"
                    popperPlacement="bottom-start"
                    onChange={(date) => {
                        setEndDate(date)
                        onChange?.(ymd(startDate), ymd(date))
                    }}
                />
            </div>
        </div>
    )
}

export default TaskDateRange
