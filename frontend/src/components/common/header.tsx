

import Image from 'next/image';
import Link from 'next/link';
import { CgProfile } from 'react-icons/cg';
import { IoMdSettings } from 'react-icons/io';

export default function Header() {

    return (
        <header className="bg-white dark:bg-background-grey flex items-center justify-center h-16 border-b-4 border-primary">
            <div className="flex justify-between w-full p-2">
                <div className="h-12 w-12 overflow-hidden rounded-full">
                    <Image 
                    src="/images/Logo.png"
                    alt="logo"
                    width={160}
                    height={160}
                    />
                </div>
                <div className="flex gap-2">
                    <Link href='/auth'>
                        <button className="bg-primary hover:bg-primary-hover px-4 py-2 rounded-4 h-12 w-12 flex flex-col items-center justify-center gap-2"          >
                            <IoMdSettings size={60}/>
                        </button>
                    </Link>
                    <div>
                        <button className="bg-primary hover:bg-primary-hover px-4 py-2 rounded-full h-12 w-12 flex flex-col items-center justify-center gap-2"          >
                            <CgProfile size={60}/>
                        </button>
                    </div>
                </div>              
            </div>
        </header>
    )
}