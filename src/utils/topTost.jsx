import Swal from "sweetalert2";
import withReactContent from 'sweetalert2-react-content'
const MySwal = withReactContent(Swal)

// topTost(message?, icon?) - icon: success | error | warning | info (it used to ignore both and always say success)
const topTost = (message = 'Action Execute Successfully', icon = 'success') => {
    MySwal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        backdrop:false,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
    }).fire({
        icon: ['success', 'error', 'warning', 'info', 'question'].includes(icon) ? icon : 'success',
        title: typeof message === 'string' ? message : 'Action Execute Successfully'
    });
}

export default topTost