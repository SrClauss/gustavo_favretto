import React from 'react';
import { Card, Typography, Box, Icon, Divider } from '@mui/material';


interface KpiProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    bottomText?: string;
    color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
}

const KPI: React.FC<KpiProps> = ({ title, value, icon, bottomText, color = 'primary' }) => {
    return (
        <Card
            sx={{
                display: 'flex',
                alignItems: 'center',
                p: 2,
                height: "15vh",
                width: "30vh"
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                <Icon color={color}>
                    {icon}
                </Icon>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box sx={{ flex: 1, ml: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="subtitle2" color="textSecondary">
                    {title}
                </Typography>
                <Typography variant="h5" color={color}>
                    {value}
                </Typography>
                {bottomText && (
                    <Typography variant="body2" color="textSecondary">
                        {bottomText}
                    </Typography>
                )}
            </Box>
        </Card>
    );
};

export default KPI;
