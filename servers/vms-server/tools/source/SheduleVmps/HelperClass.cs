using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using log4net.Appender;
using Newtonsoft.Json;
using Vestris.VMWareLib;
using System.IO;
using System.Net;
using log4net;
using System.Xml;

namespace SheduleVmps
{
  public  class HelperClass
  {

      public string id;
      private static readonly ILog Log = LogManager.GetLogger(typeof(HelperClass));
      public static string configvalue;
      //public SheduleVmpsConfig _configuration = SheduleVmpsConfig.LoadConfig();
      public dynamic virtualHost = new VMWareVirtualHost();
      public VmpsData Vmdata = null;
      public List<VMPSConfig> vmconfiglist=new List<VMPSConfig>();
      VMPSConfig configvm=new VMPSConfig();
      public HelperClass(VmpsData Vmdatas)

      {
          Vmdata = Vmdatas;
          virtualHost.ConnectToVMWareWorkstation();
          vmconfiglist = SheduleVmpsConfig.GetConfigDetails();

      } 
     
       public  void StartVm()
       {
           try
           {
               if (Loginstatus(Vmdata.Idval))
               {
                   Log.Info("Start Vm !");


                   foreach (var vmpsConfig in vmconfiglist)
                   {

                       if (Vmdata.Idval == vmpsConfig.id)
                       {
                           string file = vmpsConfig.PathToVMWareVMXFile;
                           using (var virtualMachine = virtualHost.Open(vmpsConfig.PathToVMWareVMXFile))
                           {

                               Log.Info("Open Vm : " + vmpsConfig.PathToVMWareVMXFile);
                               VMWareSnapshot lokiSnapshot =virtualMachine.Snapshots.GetNamedSnapshot(vmpsConfig.flavour);
                               lokiSnapshot.RevertToSnapshot();
                               virtualMachine.PowerOn();
                               virtualMachine.WaitForToolsInGuest();
                               Thread.Sleep(30000);
                               try
                               {
                                   //virtualMachine.LoginInGuest("testuser", "test", 8, 180);
                                  virtualMachine.LoginInGuest("Sujit", "Ushustech123", 8, 180);
                                   Log.Info("Succesfully log in Guest in Vm");
                               }
                               catch (Exception ex)
                               {
                                   virtualMachine.ShutdownGuest();
                                   Log.Info("Failed to log in Guest in Vm" + ex);
                               }


                               try
                               {
                                   Log.Info("Copying Script in Vm : " + vmpsConfig.vmpath);
                                   virtualMachine.CopyFileFromHostToGuest(vmpsConfig.localpath, vmpsConfig.vmpath);
                                   Log.Info("Copied Succesfully...");
                                   string fileinfo = vmpsConfig.vmpath + "\\NodeSetup.cmd";
                                   Log.Info("File:  "+fileinfo);
                                   virtualMachine.RunProgramInGuest(fileinfo,Vmdata.Jobid);
                                   Log.Info("File opened Succesfully...");

                                  Thread.Sleep(10000);
                               }
                               catch (Exception ex)
                               {
                                   Log.Info("Failed to copy..."+ex);
                               }
                           }
                       }

                   }

               }
               else
               {
                   Console.WriteLine("The Machine is already up.....");
               }
           }
           catch (Exception ex)
           {

              Log.Info("Failed to Start Vm"+ ex);
           }

       }
       public  void Showrunningvm()
       {
           try
           {
               Log.Info("Entering method Showrunningvm");
               ListAllVm(virtualHost);
           }
           catch (Exception ex)
           {
               Log.Info("Failed Showrunningvm vm"+ex);
              
           }
         
         
       }
       public  void Checkvmstatus()
       {
           try
           {
               Log.Info("Entering Checkvmstatus method");
               foreach (var vmpsConfig in vmconfiglist)
               {
                   if (Vmdata.Idval == vmpsConfig.id)
                   {
                       VmCurrentStatus(virtualHost);
                   }
               }
           }
           catch (Exception ex)
           {

               Log.Info("Failed Checkvmstatus method"+ex);
           }
     
          
       }
       public void  Stopvm(  )
       {
           try
           {
               Log.Info("Entering Stopvm method");
               foreach (var vmpsConfig in vmconfiglist)
               {
                   if (Vmdata.Idval == vmpsConfig.id)
                   {
                       ShutdownAllRunningVirtualMachines(virtualHost);
                   }
               }

              
           }
           catch (Exception ex)
           {
               Log.Info("Failed Stopvm method" + ex);
               
           }
          

       }

       private  void ShutdownAllRunningVirtualMachines(VMWareVirtualHost virtualHost)
       {
           try
           {

            Log.Info("ShutdownAllRunningVirtualMachines Started");
           var crap = virtualHost.RunningVirtualMachines;
               if(crap.Count()>0)
               {
                   foreach (var machine in crap)
                   {
                      

                       machine.ShutdownGuest();
                       Log.Info("ShutdownAllRunningVirtualMachines Succesfully");

                   }
               }
               else
               {
                   Log.Info("No Vm is up");
               }
          
           }
           catch (Exception ex)
           {
               Log.Info("Failed to ShutdownAllRunningVirtualMachines "+ex);
               
           }
       }
       private void ListAllVm(VMWareVirtualHost virtualHost)
       {

           try
           {
          Log.Info("List All Vm");
          StringBuilder builderjson=new StringBuilder();
          string jsonstring = string.Empty;
          var crap = virtualHost.RunningVirtualMachines;
          if (crap.Count() > 0)
          {
              JsonDictionary<String, Object> result = new JsonDictionary<String, Object>();
              foreach (var machine in crap)
              {
                  Dictionary<string, string> dictos = GetIdOsDetails(machine.PathName);

                  foreach (var dicto in dictos)
                  {
                      result[dicto.Key] = dicto.Value;
                      jsonstring = JsonConvert.SerializeObject(result);

                  }
                  builderjson.Append(jsonstring);

              }

              Console.WriteLine(builderjson.ToString());
          }
          else
          {
              Console.WriteLine("There is no  Vm is Up..");
          }
              
           }
           catch (Exception ex)
           {

               Log.Info("Failed to List All Vm"+ex);
           }
       }
      

      private void VmCurrentStatus(VMWareVirtualHost virtualHost)
       {
           try
           {
               Log.Info("VmCurrentStatus method");
          
          var crap = virtualHost.RunningVirtualMachines;
          if (crap.Count() > 0)
          {
              foreach (var machine in crap)
              {
                  if (machine.IsRunning)
                  {
                      Console.WriteLine(Vmdata.Idval + " Machine is up now");

                  }
              }
          }
          else
          {
              Console.WriteLine(Vmdata.Idval +" Machine is in shut down stage");
          }
           }
           catch (Exception ex)
           {

               Log.Info("VmCurrentStatus failed");
           }

       }

      private Dictionary<string,string > GetIdOsDetails(string pathname)
      {
          Dictionary<string, string> idosdetails = new Dictionary<string, string>();
          try
          {
              Log.Info("GetIdOsDetails method");
              
              foreach (var vmpsConfig in vmconfiglist)
              {
                  if (pathname == vmpsConfig.PathToVMWareVMXFile)
                  {
                      idosdetails.Add("ID", vmpsConfig.id);
                      idosdetails.Add("OS", vmpsConfig.FullyQualifiedOSName);
                  }
              }
            
          }
          catch (Exception ex)
          {

              Log.Info("Failed GetIdOsDetails"+ex);
          }
          return idosdetails;
        

      }

    
      public  void GetAllvm()
      {
         // Log.Info("Get All Vm");
          try
          {
              int i = 0;
              StringBuilder buildjson=new StringBuilder();
              string jsonstring = string.Empty;
              JsonDictionary<String, Object> result = new JsonDictionary<String, Object>();
             buildjson.Append("[");
              foreach (var vmpsConfig in vmconfiglist)
              {
                  i ++;
                  result["ID"] = vmpsConfig.id;
                  result["OS"] = vmpsConfig.FullyQualifiedOSName;
                  result["FLAVOUR"] = vmpsConfig.flavour;
                  jsonstring = JsonConvert.SerializeObject(result);
                  buildjson.Append(jsonstring);
                  if(vmconfiglist.Count!=i)
                  {
                      buildjson.Append(",");
                  }
                 
              }
              buildjson.Append("]");
              Console.WriteLine(buildjson);

          }
          catch (Exception ex )
          {
              
              Log.Info("Failed to get All Vm");
          }
       

      }

      private bool Loginstatus(string id)
      {
          bool islog = true;
           Log.Info("ShutdownAllRunningVirtualMachines Started");

          try
          {
           var crap = virtualHost.RunningVirtualMachines;
           if (crap.Count > 0)
           {
               foreach (var machine in crap)
               {
                   if( machine.PathName==Getmachinepath(id))
                   {
                       islog = false;
                   }
               }
           }
          }
          catch (Exception ex)
          {

              Log.Info("ShutdownAllRunningVirtualMachines Failed" +ex);
          }
          return islog;

      }

          private string Getmachinepath(string id)
          {
              string vmid = string.Empty;
              foreach (var vmconfig in vmconfiglist)
              {
                  if(id==vmconfig.id)
                  {
                      vmid = vmconfig.PathToVMWareVMXFile;
                  }
              }
              return vmid;
          }

    }
}
