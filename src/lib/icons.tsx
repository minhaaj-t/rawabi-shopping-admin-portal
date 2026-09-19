import type { FC } from "react";
import type { IconProps } from "react-iconly";
import {
  Activity,
  AddUser,
  ArrowDown as IconlyArrowDown,
  ArrowLeft as IconlyArrowLeft,
  ArrowUp as IconlyArrowUp,
  Bag,
  Bag2,
  Buy,
  Calendar as IconlyCalendar,
  Call,
  Camera as IconlyCamera,
  Category,
  Chart,
  Chat,
  ChevronDown as IconlyChevronDown,
  ChevronLeft as IconlyChevronLeft,
  ChevronRight as IconlyChevronRight,
  CloseSquare,
  Danger,
  Delete,
  Discount,
  Discovery,
  Document,
  Download as IconlyDownload,
  EditSquare,
  Filter as IconlyFilter,
  Filter2,
  Folder,
  Graph,
  Heart,
  Hide,
  Home as IconlyHome,
  Image,
  InfoCircle,
  Location,
  Logout,
  Message,
  MoreSquare,
  Notification,
  Paper,
  PaperUpload,
  People,
  Plus as IconlyPlus,
  Scan,
  Search as IconlySearch,
  Send as IconlySend,
  Setting,
  ShieldDone,
  Show,
  Star as IconlyStar,
  Swap,
  TickSquare,
  TimeCircle,
  TwoUsers,
  Upload as IconlyUpload,
  User as IconlyUser,
  Video as IconlyVideo,
  VolumeUp,
  Voice,
  Wallet as IconlyWallet,
  Work,
} from "react-iconly";

export type AppIconProps = IconProps & {
  className?: string;
  strokeWidth?: number;
  "aria-hidden"?: boolean | "true" | "false";
};

export type AppIcon = FC<AppIconProps>;
export type LucideIcon = AppIcon;

function asIcon(Icon: FC<IconProps>): AppIcon {
  return Icon as unknown as AppIcon;
}

export const Search = asIcon(IconlySearch);
export const Keyboard: AppIcon = ({ size = 24, className, strokeWidth = 1.75, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    role="presentation"
    {...props}
  >
    <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
    <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 13.5h.01M12 13.5h.01M16 13.5h.01" />
  </svg>
);
export const X = asIcon(CloseSquare);
export const Filter = asIcon(IconlyFilter);
export const MessageCircle = asIcon(Chat);
/** Filled WhatsApp mark — stays readable at 14–16px (outline paths wash out). */
export const WhatsApp: AppIcon = ({ size = 24, className, strokeWidth: _strokeWidth, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    role="presentation"
    aria-hidden="true"
    {...props}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
  </svg>
);
export const Plus = asIcon(IconlyPlus);
export const RotateCcw = asIcon(Swap);
export const ArrowLeft = asIcon(IconlyArrowLeft);
export const ArrowDown = asIcon(IconlyArrowDown);
export const ArrowUp = asIcon(IconlyArrowUp);
export const CheckCheck = asIcon(TickSquare);
export const Mail = asIcon(Message);
export const MoreVertical = asIcon(MoreSquare);
export const Paperclip = asIcon(Paper);
export const Phone = asIcon(Call);
export const Send = asIcon(IconlySend);
export const Smile = asIcon(Heart);
export const Download = asIcon(IconlyDownload);
export const ExternalLink = asIcon(Discovery);
export const Bell = asIcon(Notification);
export const MapPin = asIcon(Location);
export const Package = asIcon(Bag);
export const ShoppingBag = asIcon(Bag2);
export const ShoppingCart = asIcon(Buy);
export const Star = asIcon(IconlyStar);
export const Trash2 = asIcon(Delete);
export const Inbox = asIcon(Document);
export const Wrench = asIcon(Setting);
export const LifeBuoy = asIcon(InfoCircle);
export const ChevronDown = asIcon(IconlyChevronDown);
export const ChevronRight = asIcon(IconlyChevronRight);
export const ChevronLeft = asIcon(IconlyChevronLeft);
export const LogOut = asIcon(Logout);
export const Menu = asIcon(Category);
export const BarChart3 = asIcon(Chart);
export const LineChart = asIcon(Graph);
export const Boxes = asIcon(Bag2);
export const Building2 = asIcon(Location);
export const Briefcase = asIcon(Work);
export const ClipboardList = asIcon(Document);
export const FolderTree = asIcon(Folder);
export const LayoutDashboard = asIcon(Activity);
export const Megaphone = asIcon(VolumeUp);
export const MonitorSmartphone = asIcon(Scan);
export const Settings = asIcon(Setting);
export const Settings2 = asIcon(Filter2);
export const Truck = asIcon(IconlySend);
export const Users = asIcon(TwoUsers);
export const Upload = asIcon(IconlyUpload);
export const Sparkles = asIcon(IconlyStar);
export const Languages: AppIcon = ({ size = 24, className, strokeWidth = 1.5, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    role="presentation"
    aria-hidden="true"
    {...props}
  >
    <path
      d="M12.6858 15.596C12.5576 16.3787 12.8184 17.2794 13.6212 17.6066C14.4993 17.9645 15.1076 17.9339 16.2786 17.7393C17.5391 17.5298 18.0536 16.8684 17.9681 15.596C17.9199 14.8775 17.5617 14.1873 16.9403 14.1119C16.4675 14.0546 16.1241 14.3869 15.9774 14.8456C15.8082 15.3748 15.8721 15.8696 16.483 15.973C16.9392 16.0502 17.5535 15.9529 17.9446 15.8909L17.95 15.8901"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16.7736 12.0905H16.7765M16.7125 12.1544C16.6772 12.1191 16.6772 12.0618 16.7125 12.0265C16.7479 11.9912 16.8051 11.9912 16.8405 12.0265C16.8758 12.0618 16.8758 12.1191 16.8405 12.1544C16.8051 12.1897 16.7479 12.1897 16.7125 12.1544Z"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.42887 9.12043H6.364M10.0087 10.4168L7.89644 5.69434L5.78418 10.4168"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.57826 3H12.8895C15.0955 3 16.4685 4.57563 16.4685 6.80537V7.37255H17.421C19.6269 7.37255 21 8.94818 21 11.1779V17.1946C21 19.4244 19.6269 21 17.4203 21H11.1097C8.90307 21 7.53146 19.4244 7.53146 17.1946V16.6274H6.57826C4.37161 16.6274 3 15.0518 3 12.8221V6.80537C3 4.57563 4.37889 3 6.57826 3Z"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16.4765 7.37109L7.5401 16.6336"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export const Calendar = asIcon(IconlyCalendar);
export const AlertTriangle = asIcon(Danger);
export const Layers = asIcon(Category);
export const Tag = asIcon(Discount);
export const Wallet = asIcon(IconlyWallet);
export const XCircle = asIcon(CloseSquare);
export const Monitor: AppIcon = ({ size = 24, className, strokeWidth = 1.75, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    role="presentation"
    aria-hidden="true"
    {...props}
  >
    <rect
      x="3"
      y="4"
      width="18"
      height="12"
      rx="2"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
    <path
      d="M8 20h8M12 16v4"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export const Smartphone: AppIcon = ({ size = 24, className, strokeWidth = 1.75, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    role="presentation"
    aria-hidden="true"
    {...props}
  >
    <rect
      x="8"
      y="2.5"
      width="8"
      height="19"
      rx="2"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
    <path
      d="M11 5.5h2M11 18.5h2"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </svg>
);
export const Tablet = asIcon(Scan);
export const Laptop = asIcon(Scan);
export const Home = asIcon(IconlyHome);
export const Palette = asIcon(Image);
export const ImageIcon = asIcon(Image);
export const FileText = asIcon(Document);
export const FilePen = asIcon(EditSquare);
export const Camera = asIcon(IconlyCamera);
export const Video = asIcon(IconlyVideo);
export const Shield = asIcon(ShieldDone);
export const User = asIcon(IconlyUser);
export const FileUp = asIcon(PaperUpload);
export const Printer = asIcon(Paper);
export const CreditCard = asIcon(IconlyWallet);
export const Globe2 = asIcon(Discovery);
export const Plug = asIcon(Setting);
export const Receipt = asIcon(Paper);
export const Store = asIcon(IconlyHome);
export const SlidersHorizontal = asIcon(Filter2);
export const Headphones = asIcon(Voice);
export const UserCog = asIcon(Setting);
export const UserPlus = asIcon(AddUser);
export const UsersRound = asIcon(People);
export const Eye = asIcon(Show);
export const EyeOff = asIcon(Hide);
export const Copy = asIcon(Paper);
export const GripVertical = asIcon(Category);
export const Clock = asIcon(TimeCircle);
export const Warehouse = asIcon(Folder);
export const ActivityIcon = asIcon(Activity);
