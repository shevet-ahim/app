<?

function fatal($str){
    die("\n\nFATAL: {$str}\n");
}

$u =trim(shell_exec("whoami"));

if( $u!='root')
    fatal("you must to be root to restart adb server, modify config files, etc");

$argv[1] = empty($argv[1]) ? 'lg' : $argv[1];

if(empty($argv[1]))
    fatal("debug.php <device> ERROR: device is empty.");

$dev = trim($argv[1]);
 
$devices = explode("\n",shell_exec("lsusb"));

//print_r($devices);

$dev_id = false;

// fixme: add multiple devices
foreach($devices as $k=>$d){
    if(!stristr($d,$dev)) 
        continue;

    $row = explode(' ',$d);
    $dev_id = end(explode(':',$row[5]));
    break;    
}

if(!$dev_id)
    fatal("device not found.pleae run lsusb to show usb devices list");

unlink('/root/.android/adb_usb.ini');
//file_put_contents("~/.android/adb_usb.ini",$dev_id);
file_put_contents("/root/.android/adb_usb.ini",$dev_id);

shell_exec("adb kill-server");
shell_exec("adb start-server");

$devices = shell_exec("adb devices");
// fixme: add multiple devices

// get first device
$rows = explode("\n",$devices);

//  [1] => S8SGOFYS498SA68T	device

$hash = current(explode("\t",$rows[1]));

if(!$hash)
    fatal("unable to get hash");

$cmd = "cordova run android --target={$hash} --stacktrace";

echo "\n\n {$cmd} ";

print_r(shell_exec($cmd));
echo "\n\n DONE.";
//echo "\n\n DONE.\n please execute:\n $cmd \n";


