using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using log4net;
using log4net.Appender;
using log4net.Config;

namespace SheduleVmps
{
 public   class Program
    {

     private static readonly ILog Log = LogManager.GetLogger(typeof(Program));
        static void Main(string[] args)
        {
            string logpath = Path.GetDirectoryName(Assembly.GetAssembly(typeof(SheduleVmpsConfig)).Location)+"\\Shedulevmps.Log.Log";
            TextWriter tw = File.CreateText(logpath);
            var textWriterAppender = new TextWriterAppender()
            {
                Layout = new log4net.Layout.PatternLayout("%d %-5p %method :> %m%n"),
                Writer = tw,

                ImmediateFlush = true
            };

            var consoleAppender = new ConsoleAppender
            {
                Layout = textWriterAppender.Layout
            };

            BasicConfigurator.Configure(new IAppender[] { textWriterAppender, consoleAppender });
           
            GetVirtualMachineStatus(args);

        }

        public static  void GetVirtualMachineStatus( string[] argment)
        {

           
            VmpsData Vmdata = new VmpsData();
            foreach (string vm in argment)
            {
                string[] vid = vm.Split('=');
                if (vid[0] == "MODE")
                {
                    Vmdata.Modeval= vid[1];
                }
                else if (vid[0] == "ID")
                {
                    Vmdata.Idval = vid[1];
                }
                else if (vid[0] == "JOBID")
                {
                    Vmdata.Jobid = vid[1];
                }

                #region
                //else if (vid[0] == "VMFilePath")
                //{
                //    Vmdata.PathToVMWareVMXFile = vid[1];
                    
                //}
                //else if (vid[0] == "ShutdownVM")
                //{
                //    Vmdata.ShutdownVMWarw = vid[1];

                //}
                //else if (vid[0] == "SnapshotVM")
                //{
                //    Vmdata.SnapshotName = vid[1];

                //}
                //else if (vid[0] == "StatusVMWarw")
                //{
                //    Vmdata.StatusVMWarw = vid[1];

                //}
#endregion
            }

            HelperClass hs=new HelperClass(Vmdata);

            //StartVm
            if (Vmdata.Modeval == "Startvm")
            {
                Log.Info("Start VM");
                
                hs.StartVm();
            }
            //List Currently Running Vm
            else if (Vmdata.Modeval == "Showlivevm")//Get Live vm's-modify
            {
                hs.Showrunningvm();
            }
            //Check Vm Status
            else if (Vmdata.Modeval == "Checkvmstatus")
            {
                Log.Info("Checkvmstatus");
                hs.Checkvmstatus();
            }
            //Stop Vm
            else if (Vmdata.Modeval == "Stopvm")
            {
                hs.Stopvm();
            }
            //GetAllvm's-Add
            else if(Vmdata.Modeval=="ShowAllvm")
            {
                hs.GetAllvm();
            }
        }

    }
}
