using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Xml;
using System.Xml.Serialization;
using log4net;

namespace SheduleVmps
{

    public  class SheduleVmpsConfig
    {
        private static readonly ILog Log = LogManager.GetLogger(typeof(SheduleVmpsConfig));
   
        public static List<VMPSConfig> GetConfigDetails()
        {
            List<VMPSConfig> vmconfiglist = new List<VMPSConfig>();
            try
            {
             //   Log.Info("GetConfigDetails method");
            XmlDocument xml = new XmlDocument();
            string theDirectory = Path.GetDirectoryName(Assembly.GetAssembly(typeof(SheduleVmpsConfig)).Location);
            string pathToConfig = "SheduleVmps.config";
            string alternatePathToConfig = Path.Combine(theDirectory, pathToConfig);
            xml.Load(alternatePathToConfig);
            XmlNodeList localpath = xml.GetElementsByTagName("LocalPath");
            XmlNodeList xnList = xml.SelectNodes("/SheduleVmpsConfig/vmlist/vms");

            foreach (XmlNode xmlnode in xnList)
            {
                VMPSConfig configvm = new VMPSConfig();
                configvm.id = xmlnode.Attributes.GetNamedItem("ID").Value;
                configvm.FullyQualifiedOSName = xmlnode.Attributes.GetNamedItem("OS").Value;
                configvm.PathToVMWareVMXFile = xmlnode.Attributes.GetNamedItem("PATH").Value;
                configvm.flavour = xmlnode.Attributes.GetNamedItem("FLAVOUR").Value;
                configvm.vmpath = xmlnode.Attributes.GetNamedItem("VMPATH").Value;
                configvm.localpath = localpath[0].InnerText;
                vmconfiglist.Add(configvm);
            }
          
            }
            catch (Exception ex)
            {
                Log.Info("Failed GetConfigDetails");
              
            }
            return vmconfiglist;
        }

    }
}
