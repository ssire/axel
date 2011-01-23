#!/usr/bin/ruby
#
# Sample Web server showing basic XTiger XML integration
#
# This server launches different servlets to illustrate different services 
# described before each service. 
#
# Usage: 
# 1. starts the server in a Terminal by executing ./server.rb
# 2. point your browser at http://localhost:8042/editor/editor.xhtml
#

require 'webrick'
require 'stringio'
include WEBrick

my_mime_types = WEBrick::HTTPUtils::DefaultMimeTypes
my_mime_types.update({"xtd" => "application/xml"})
# my_mime_types.update({"xtd" => "application/xhtml+xml"})
# my_mime_types.update({"xhtml" => "text/xml"})
# my_mime_types.update({"xhtml" => "text/html"})
my_mime_types.update({"xhtml" => "application/xhtml+xml"})
params = { :Port        => 8042,
           :MimeTypes   => my_mime_types}
server = HTTPServer.new(params)

#
# 1. Classical file server service
#    =============================
#
# It gives access to the AXEL source tree tree under the root '/'
# Mainly targeted at executing editor/editor.xhtml from the server
#
server.mount('/', WEBrick::HTTPServlet::FileHandler, File.dirname(__FILE__) + '/../..', { :FancyIndexing => true })

#
# 2. GET / POST handler for XML data file created with editor/editor.xhml
#    ====================================================================
#
# They work with the "Load" / "Save" buttons hidden in the Preferences panel of the editor
# 
class StoreServlet < HTTPServlet::AbstractServlet

  # Must be of the form /store?file=filename 
  def do_GET(req, res)
    if req.query['file']
      print "StoreServlet GET request with file = ", req.query['file'], "\n"
      # FIXME : we should test file existence and return error otherwise
      File.open("../#{req.query['file']}", 'r') do |io|
        res.body = io.read()
        res.status = 200
        res['Content-Type'] = "application/xml"
      end
    else 
      res.status = 400
    end
  end
  
  # FIXME: I do it the dirty way with Regexp to parse parameters direclty in the URL line (request_line)
  #        This is not the way a serious POST should work !
  def do_POST(req, res)
    if req.request_line =~ /store\?file=(.*) HTTP.*/
        print "StoreServlet POST request with file = '#$1'\n";
        File.open("../#$1", 'w') do |io|  # add '..' because paths will be relative to editor.xhtml !
          io.write(req.body)
        end
        res.status = 201        
    else 
      res.status = 400      
    end
    res.body = "Done"
    res['Content-Type'] = "text/plain"
  end
end

# FIXME: reactivate
server.mount("/store", StoreServlet)

#
# 3. POST handler for Form multipart/data-form file upload service
#    =============================================================
#
# To be used with <form id="xt-photo-form" enctype="multipart/form-data" method="POST" 
#                       action="http://localhost:8042/formUpload" target="xt-photo-target">
#
# See bundles/photo/photo.xhtml
#
class FileUploadServlet < HTTPServlet::AbstractServlet
    def do_POST(req, res)
      print "FileUploadServlet saving file request from document : '", req.query["documentId"], "'\n";
      print "Content length: ", req.content_length(), "\n"
      print "Content type: ", req.content_type(), "\n"
      prefix = req.query["documentId"]
      suffix = Time.now.to_i.to_s[-2, 2] + Time.now.usec.to_s[-2, 2] # resource id
      targetfile = "../../data/photos/#{prefix}-#{suffix}.jpg"
      if filedata = req.query["xt-photo-file"]
        begin
          f = File.open(targetfile, "wb")
          f.syswrite filedata
          f.close           
          # res.body = "<script type='text/javascript'>window.parent.finishTransmission(1,'#{targetfile}')</script>";
          res.body = "<script type='text/javascript'>window.parent.finishTransmission(1,{url:'#{targetfile}',resource_id:#{suffix}})</script>";
        rescue Exception => e
          res.body = "<script type='text/javascript'>window.parent.finishTransmission(0,'#{e.message}')</script>";
        end
      end                                                                                                           
      res['Content-Type'] = "text/html"
      sleep(3) # slow server simulation        
  end
end

server.mount("/formUpload", FileUploadServlet)
#server.mount("/xtiger/add_photo_to_menu", FileUploadServlet)

#
# 4. POST handler for data saved with HTML 5 DnD, FileReader and XHR APIs
#    ====================================================================
#
class XHRUploadServlet < HTTPServlet::AbstractServlet
  def do_POST(req, res)
    result = "no document specified"
    if req.path =~ /upload$/
      docname, filecontent = req.body.split('$$$')
      suffix = Time.now.to_i.to_s[-2, 2] + Time.now.usec.to_s[-2, 2]      
      targetfile = "../../data/photos/#{docname}-#{suffix}.jpg"
      print "Save POST data into ", targetfile, "\n"
      File.open(targetfile, 'w') do |io|
        io.write(filecontent)
        # io.write(req.body)
      end  
      #result = "../data/photos/#{docname}-#{suffix}.jpg"
      result = "http://localhost:8042/data/photos/#{docname}-#{suffix}.jpg"
      res.status = 201   
    else 
      res.status = 400
    end      
    print "Content length: ", req.content_length(), "\n"
    print "Content type: ", req.content_type(), "\n"
    res.body = result
    res['Content-Type'] = "text/plain"
    res['Access-Control-Allow-Origin'] = '*' # req['Origin'] # '*' is enough if we do not read Cookies
    sleep(3) # slow server simulation
    # res['Access-Control-Allow-Credentials'] = true # this is for Cookies    
    # res['Connection'] = "close"    
  end
  def do_OPTIONS(req, res)                          
    print "Handle OPTIONS request", "\n"
    # Origin: http://foo.example
    # Access-Control-Request-Method: POST
    # Access-Control-Request-Headers: X-PINGOTHER
    print "Origin : ", req['Origin'], "\n"
    # puts req.body
    res.status = 200
    res['Content-Type'] = "text/plain"
    res['Access-Control-Allow-Origin'] = '*'
    res['Access-Control-Allow-Methods'] = 'POST'   
    res['Access-Control-Allow-Headers'] = 'Content-Type, Cache-Control'       
    res['Access-Control-Max-Age'] = 5
  end
end
  
# FIXME: reactivate
#server.mount("/upload", XHRUploadServlet)

#
# 5. Time server
#    ===========
#
# basic mapping to test if server is running...
server.mount_proc('/time') do |request, response|
    response.body = Time.now.to_s;
end


#
# 6. GET handler for photo files
#    ===========================
#
# GET maps URL that ends with photo/* to files located in the ../../photo folder of the source tree
# from the server location. This is a trick so that photo saved from the editor can also 
# be displayed when lauching the editor and the template from the file system and not 
# behind a http://localhost:8042 URL
# 
# class PhotoAccessServlet < HTTPServlet::AbstractServlet
#   def do_GET(req, res)
#     if req.path =~ /store\/(.*)$/
#       print "Load data from ", "../../data/#$1", "\n"
#       # FIXME : we should test file existence and return error otherwise
#       File.open("../../data/#$1", 'r') do |io|
#         res.body = io.read()
#       end
#     else 
#       res.body = "Not implemented"
#       # FIXME : we should send an error
#     end
#     res.status = 200
#     res['Content-Type'] = "application/xml"
#   end
# 
#   # FIXME: to be done !
#   def do_POST(req, res)
#   end
# end


trap('INT') { server.shutdown }
server.start();

#
#  Unused CODE that could be useful...
#  =========== =========== ===========
#
# class NonCachingFileHandler < WEBrick::HTTPServlet::FileHandler
#   def prevent_caching(res)
#     res['ETag']          = nil
#     res['Last-Modified'] = Time.now + 100**4
#     res['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0'
#     res['Pragma']        = 'no-cache'
#     res['Expires']       = Time.now - 100**4
#   end
#   
#   def do_GET(req, res)
#     super
#     prevent_caching(res)
#   end
# end
# server.mount "/", NonCachingFileHandler , File.dirname(__FILE__) + '/../..', { :FancyIndexing => true }

# Trick to rewrite URLs (may be useful to have "../../photos URLs" rewritten to "../photos") 
# so that sample documents with photos can be opened independently from http://localhost:8042 or from file://
# 
# class WEBrick::HTTPServer
#   alias :__rewrite_old_initialize :initialize
#   alias :__rewrite_old_service :service
#   def initialize(config={}, default=WEBrick::Config::HTTP)
#     __rewrite_old_initialize(config, default)
#     @rewrite_rules = []
#   end
#   def rewrite(pattern, subst)
#     @logger.info("rewrite rule %s -> %s." % 
#                   [pattern.inspect, subst])
#     @rewrite_rules << [pattern, subst]
#   end
#   def service(req, res)
#     olduri = URI.parse(req.path)
#     olduri.query = req.query_string
#     old = olduri.to_s
#     @rewrite_rules.each do |pattern, subst|
#       if pattern =~ old
#         uri = URI.parse(old.gsub(pattern, subst))
#         req.instance_variable_set("@path", uri.path)
#         req.instance_variable_set("@query_string", uri.query)
#         req.instance_variable_set("@query", nil)  # so it gets reparsed
#         @logger.info("Rewrote URL %s -> %s" % [olduri.to_s, uri.to_s])
#         break
#       end
#     end
#     __rewrite_old_service(req, res)
#   end
# end

