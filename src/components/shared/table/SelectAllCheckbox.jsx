import React, { useEffect, useRef } from 'react'

/** "Select all rows" checkbox for TanStack table headers (supports the indeterminate state). */
const SelectAllCheckbox = ({ table }) => {
    const ref = useRef(null)
    const some = table.getIsSomeRowsSelected()
    useEffect(() => {
        if (ref.current) ref.current.indeterminate = some
    }, [some])
    return (
        <input
            type="checkbox"
            className="custom-table-checkbox"
            ref={ref}
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
        />
    )
}

export default SelectAllCheckbox
