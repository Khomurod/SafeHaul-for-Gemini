export const ALL_COLUMNS = [
    {
        key: 'name',
        label: 'Driver / Contact',
        minWidth: 200,
        width: 300,
        align: 'text-left'
    },
    {
        key: 'status',
        label: 'Status',
        minWidth: 100,
        width: 140,
        align: 'text-center'
    },
    {
        key: 'lastCall',
        label: 'Last Call',
        minWidth: 140,
        width: 160,
        align: 'text-center'
    },
    {
        key: 'qualifications',
        label: 'Position / Type',
        minWidth: 150,
        width: 200,
        align: 'text-left'
    },
    {
        key: 'assignee',
        label: 'Recruiter',
        minWidth: 140,
        width: 160,
        align: 'text-left'
    },
    {
        key: 'date',
        label: 'Application Date',
        minWidth: 130,
        width: 160,
        align: 'text-right'
    }
];

export const DEFAULT_VISIBLE_COLUMNS = ALL_COLUMNS.map(col => col.key);
