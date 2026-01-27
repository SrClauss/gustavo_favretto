import { Box,  Typography } from "@mui/material";

export default function Home() {

    /*
        const [cawabunga, setCawabunga] = useState("");
        useEffect(() => {
            const fetchData = async () => {
                const response = await window.eel.cawabunga()();
                if (typeof response === "string") {
                    setCawabunga(response);
                    return
                }
    
                setCawabunga("Erro ao buscar cawabunga");
    
            };
            fetchData();
        }, []);
       
    */

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ width: '100%', flexDirection: 'column', display: 'flex', alignItems: 'center' }}>
                <Typography variant="h4" gutterBottom>
                    Bem-vindo ao Sistema de Controle
                </Typography>
               <Box>Aqui vai uma dashboard</Box>

            </Box>

        </Box>
    )
}